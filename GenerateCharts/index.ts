import axios from "axios"
import { AzureFunction, Context } from "@azure/functions"
import { Pool } from "pg"
import * as d3 from "d3"
import { Octokit } from "@octokit/rest"
import { questions, questionMap } from "./questions"
import { generateTimelineForField, generateTimeOfDayChart } from "./charts"

const PG_CONN_STRING = process.env.PG_CONN_STRING
const SLACKBOT_API_URL = process.env.SLACKBOT_API_URL
const GH_API_KEY = process.env.GH_API_KEY
const githubCommitter = {
  "committer.name": "Good Day Bot",
  "committer.email": "octo-devex+goodday@github.com",
  "author.name": "Good Day Bot",
  "author.email": "octo-devex+goodday@github.com",
}

const pool = new Pool({
  connectionString: PG_CONN_STRING,
})

if (typeof GH_API_KEY === "undefined") {
  throw new Error("need a valid github API key")
}

const octokit = new Octokit({
  auth: GH_API_KEY,
})
type Image = {
  filename: string
  image: string
}

const fields = questions.map(({ title }) => title)

export type FormResponseField = typeof fields[number]

export type FormResponse = Record<FormResponseField | "date", string | Date>

export type User = {
  ghrepo: string
  ghuser: string
  slackid: string
  timezone: string
  // eslint-disable-next-line camelcase
  prompt_time: string
}

const getDataForUser = async (user: User) => {
  console.log(`Generating chart images for ${user.slackid}`)

  const owner = user.ghuser || "githubocto"
  const repo = user.ghrepo || "good-day-demo"
  const path = "good-day.csv"

  const response = await octokit.repos.getContent({
    owner,
    repo,
    path,
  })

  const res = response.data
  const content = "content" in res ? res.content : ""

  if (!content) return []
  const contentBuffer = Buffer.from(content, "base64").toString("utf8")
  const data = d3.csvParse(contentBuffer)

  return data
}

const createCharts = async (
  data: FormResponse[],
  startOfWeek: Date,
  endOfWeek: Date
) => {
  const [date, ...fields] = Object.keys(data[0]).filter(Boolean)
  const fieldTimelinesPromises = fields.map((field, i) =>
    generateTimelineForField(data, field, startOfWeek, endOfWeek)
  )
  const fieldTimelines = await Promise.all(fieldTimelinesPromises)
  const timeOfDayChart = await generateTimeOfDayChart(
    data,
    startOfWeek,
    endOfWeek
  )

  return [
    {
      image: timeOfDayChart,
      filename: "time-of-day.png",
    },
    ...fieldTimelines.filter(Boolean).map((timeline, i) => ({
      image: timeline,
      filename: `timeline-${i}.png`,
    })),
  ]
}

const getSha = async (filename: string, user: User) => {
  const owner = user.ghuser || "githubocto"
  const repo = user.ghrepo || "good-day-demo"
  try {
    const res = await octokit.repos.getContent({
      owner,
      repo,
      path: filename,
    })
    // @ts-ignore
    return res?.data?.sha
  } catch (e) {
    return undefined
  }
}
const saveImageToRepo = async (
  data: FormResponse[],
  images: Image[],
  user: User,
  startOfWeek: Date
) => {
  console.log(
    `Saving charts to ${user.ghuser}/${user.ghrepo} for ${user.slackid}`
  )

  const owner = user.ghuser || "githubocto"
  const repo = user.ghrepo || "good-day-demo"

  for (const image of images) {
    // @ts-ignore
    const sha = await getSha(`/${image.filename}`, user)

    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: image.filename,
      sha,
      content: image.image,
      message: "Update summary visualization",
      ...githubCommitter,
    })
  }

  const readmeSha = await getSha("/README.md", user)

  const totalDays = data.length
  let numberOfGoodDays = 0
  let numberOfBadDays = 0
  data.forEach((d) => {
    const question = questionMap["workday_quality"]
    const response = d[question.titleWithEmoji]
    const optionIndex = question.optionsWithEmoji.indexOf(response)
    if (optionIndex > 2) {
      numberOfGoodDays++
    } else {
      numberOfBadDays++
    }
  })

  const readmeContents = `
  # The Good Day Project

  ## This week's summary (week of ${d3.timeFormat("%B %-d, %Y")(startOfWeek)})

  You logged ${totalDays} days this week. ${totalDays > 3 ? "Great job!" : ""}

  ☀️ **${numberOfGoodDays}** were Good days (${d3.format(".0%")(
    numberOfGoodDays / totalDays
  )}). *These are days you rated as Awesome or Good*

  🌧 **${numberOfBadDays}** were Not-so-good days (${d3.format(".0%")(
    numberOfBadDays / totalDays
  )}). *These are days you rated as OK, Bad, or Terrible*

  Let's take a look at the data you logged for this week.

  ## Do you have a typical time of day that feels productive?

  ![Image](${images[0].filename})

  ## How you answered each question

  ${images
    .slice(1)
    .map(({ filename }) => `![Image](${filename})`)
    .join("\n")}
  `

  const readmeContentsBuffer = Buffer.from(readmeContents)
  const readmeContentsString = readmeContentsBuffer.toString("base64")

  const readmeResponse = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: "README.md",
    sha: readmeSha,
    content: readmeContentsString,
    message: "Update README",
    ...githubCommitter,
  })
}

const notifyUser = async (user: User) => {
  console.log("Notifying", user.slackid)
  axios.post(`${SLACKBOT_API_URL}/notify-summary`, {
    user_id: user.slackid,
  })
}

const convertDateToTimezone = (date, timezone: string) =>
  new Date(date.toLocaleString("en-US", { timeZone: timezone }))
const createChartsForUser = async (user: User): Promise<void> | null => {
  console.log(`Creating charts for ${user.slackid}`)
  const data = await getDataForUser(user)

  if (!data || !data.length) {
    console.log("No data found for ", user.slackid)
    return
  }
  const now = convertDateToTimezone(new Date(), user.timezone)
  const lastWeek = d3.timeWeek.offset(now, -1)
  const startOfWeek = d3.timeWeek.floor(lastWeek)
  const endOfWeek = d3.timeWeek.ceil(lastWeek)
  const thisWeeksData = data
    .filter(
      ({ date }) => new Date(date) > startOfWeek && new Date(date) < endOfWeek
    )
    .map((d) => ({
      ...d,
      date: convertDateToTimezone(new Date(d.date), user.timezone),
    }))

  if (!thisWeeksData.length) {
    console.log("No days recorded this week for ", user.slackid)
    return
  }

  const images = await createCharts(thisWeeksData, startOfWeek, endOfWeek)
  await saveImageToRepo(thisWeeksData, images, user, startOfWeek)
  await notifyUser(user)
}

const createChartsForUsers: AzureFunction = async function (
  context: Context,
  myTimer: any
): Promise<void> {
  var timeStamp = new Date().toISOString()

  if (myTimer.isPastDue) {
    context.log("Charts generation function is running late!")
  }

  context.log("Charts generation function ran!", timeStamp)

  const usersQuery = `SELECT * FROM users`

  try {
    const { rows: users = [] } = await pool.query(usersQuery)
    console.log(`Found ${users.length} users, gonna bake them some charts!`)

    const createChartsPromises = users.map((user) => createChartsForUser(user))
    await Promise.all(createChartsPromises)

    context.res = {
      status: 200,
    }
  } catch (e) {
    console.log("ERROR creating charts: ", e)
    context.res = {
      status: 422,
    }
  }
}

export default createChartsForUsers
