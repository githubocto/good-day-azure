import axios from "axios"
import { AzureFunction, Context } from "@azure/functions"
import { Pool } from "pg"
import fs from "fs"
import { createCanvas } from "canvas"
import { Chart } from "chart.js"
import * as d3 from "d3"
import { Octokit } from "@octokit/rest"
import { questions } from "./questions"

const PG_CONN_STRING = process.env.PG_CONN_STRING
const SLACKBOT_API_URL = process.env.SLACKBOT_API_URL
const GH_API_KEY = process.env.GH_API_KEY

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

export type FormResponse = Record<FormResponseField | "date", string>

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

const timelineWidth = 1200
const timelineHeight = 350
const generateTimelineForField = async (
  data: FormResponse[],
  field: FormResponseField,
  index: number
) => {
  const width = timelineWidth
  const height = timelineHeight

  const startDate = new Date(data[0].date)

  const question = questions.find((q) => q.titleWithEmoji === field)
  if (question === undefined) return

  const { optionsWithEmoji: options } = question

  const config = {
    type: "line",
    data: {
      labels: data.map((d) => d3.timeFormat("%A")(new Date(d.date))),
      datasets: [
        {
          label: field,
          borderColor: "rgb(69, 174, 177)",
          backgroundColor: "rgba(69, 174, 177, 0.1)",
          pointBackgroundColor: "rgba(69, 174, 177, 1)",
          pointRadius: 5,
          data: data.map((d) => {
            const optionIndex = options.indexOf(d[field])
            if (optionIndex === -1) return undefined
            return optionIndex
          }),
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          padding: {
            bottom: 26,
          },
          font: {
            weight: 900,
          },
          text: `${field.replace(/_/g, " ")} (week of ${d3.timeFormat(
            "%B %-d, %Y"
          )(startDate)})`,
        },
        legend: {
          display: false,
        },
      },
      layout: {
        padding: { top: 30, right: 50, bottom: 30, left: 50 },
      },
      scales: {
        y: {
          min: 0,
          max: options.length,
          stepSize: 1,
          ticks: {
            callback: (value) => options[value],
          },
        },
      },
    },
    plugins: [
      {
        beforeDraw: (chart) => {
          const ctx = chart.canvas.getContext("2d")
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, chart.width, chart.height)
        },
      },
    ],
  }

  const canvas = createCanvas(width, height)

  Chart.defaults.font = {
    family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
    style: "normal",
    size: 18,
    lineHeight: 1.2,
    weight: "500",
  }

  // @ts-ignore
  const chart = new Chart(canvas, config)

  let imageData = canvas.toDataURL("image/png")
  imageData = imageData.replace(/^data:image\/\w+;base64,/, "")

  const filename = `/tmp/timeline-${index}.png`
  await fs.writeFile(filename, imageData, { encoding: "base64" }, (e) => {
    // console.log(e);
  })

  return imageData
}

const generateTimeOfDayChart = async (data: FormResponse[]) => {}

const createCharts = async (data: FormResponse[]) => {
  const [date, ...fields] = Object.keys(data[0]).filter(Boolean)
  const fieldTimelinesPromises = fields.map((field, i) =>
    generateTimelineForField(data, field, i)
  )
  const fieldTimelines = await Promise.all(fieldTimelinesPromises)
  const timeOfDayChart = generateTimeOfDayChart(data)

  return [
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
const saveImageToRepo = async (images: Image[], user: User) => {
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
      "committer.name": "Good Day Bot",
      "committer.email": "octo-devex+goodday@github.com",
      "author.name": "Good Day Bot",
      "author.email": "octo-devex+goodday@github.com",
    })
  }

  const readmeSha = await getSha("/README.md", user)

  const readmeContents = `
  # Good Day

  ## Latest summary

  ${images.map(({ filename }) => `![Image](${filename})`).join("\n")}
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
    "committer.name": "Good Day Bot",
    "committer.email": "octo-devex+goodday@github.com",
    "author.name": "Good Day Bot",
    "author.email": "octo-devex+goodday@github.com",
  })
}

const notifyUser = async (user: User) => {
  console.log("Notifying", user.slackid)
  axios.post(`${SLACKBOT_API_URL}/notify-summary`, {
    user_id: user.slackid,
  })
}

const createChartsForUser = async (user: User): Promise<void> | null => {
  console.log(`Creating charts for ${user.slackid}`)
  const data = await getDataForUser(user)

  if (!data || !data.length) {
    console.log("No data found for ", user.slackid)
    return
  }

  const images = await createCharts(data.slice(0, 7))
  await saveImageToRepo(images, user)
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
