import axios from "axios"
import { AzureFunction, Context } from "@azure/functions"
import { Pool } from "pg"

const PG_CONN_STRING = process.env.PG_CONN_STRING
const SLACKBOT_API_URL = process.env.SLACKBOT_API_URL

const pool = new Pool({
  connectionString: PG_CONN_STRING,
})

const timerTrigger: AzureFunction = async function (
  context: Context,
  myTimer: any
): Promise<void> {
  var timeStamp = new Date().toISOString()

  if (myTimer.isPastDue) {
    context.log("Notify function is running late!")
  }

  context.log("Notify function ran!", timeStamp)

  const usersToPromptQuery = `
  SELECT
	  slackid
  FROM
	  users
  WHERE
	  extract(hour from now() at time zone timezone) = extract(hour FROM TO_TIMESTAMP(prompt_time, 'HH24:MI'))
  `

  try {
    const { rows: users } = await pool.query(usersToPromptQuery)
    await Promise.all(
      users.map(async (user) => {
        console.log("Notifying", user)
        await axios.post(`${SLACKBOT_API_URL}/notify`, {
          user_id: user.slackid,
        })
      })
    )

    context.res = {
      status: 200,
    }
  } catch (e) {
    console.log("ERROR: ", e)
    context.res = {
      status: 422,
    }
  }
}

export default timerTrigger
