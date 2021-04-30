import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Octokit } from "@octokit/rest"

const headerRow = 'date,foo,bar,baz\n'

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  const key = process.env["GH_API_KEY"]
  if (typeof key === "undefined") {
    context.res = {
      status: 500,
    }
    return
  }
  const o = new Octokit({
    auth: key,
  })

  const owner = req.body.owner
  const repo = req.body.repo
  const path = req.body.path
  const payload = req.body.payload
  if (!["owner", "repo", "path", "payload"].every((k) => k in req.body)) {
    context.res = {
      status: 422,
    }
    return
  }

  const getFile = async (
    path
  ): Promise<{ sha: string; content: string } | null> => {
    let response
    try {
      response = await o.repos.getContent({
        owner,
        repo,
        path,
      })
    } catch (error) {
      return null
    }

    const data = response.data
    if (Array.isArray(data)) {
      // the path was pointed to a directory, not a CSV file
      // complain and die
      throw new Error(
        `path "${path}" returned an array, maybe it's a directory and not a CSV?`
      )
    }

    return {
      sha: data.sha as string,
      // @ts-ignore
      content: Buffer.from(data.content || "", "base64").toString("utf8"),
    }
  }

  let file
  try {
    file = await getFile(path)
  } catch (err) {
    context.res = {
      body: (err as Error).message,
      status: 422,
    }
    return
  }

  let fileProps =
    file === null
      ? {
          content: Buffer.from(headerRow + payload + "\n").toString("base64"),
        }
      : {
          content: Buffer.from(file.content + payload).toString("base64"),
          sha: file.sha,
        }
  const { data } = await o.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: "Good Day update",
    ...fileProps,
    // committer: {
    //   name: `Good Day Bot`,
    //   email: "your-email",
    // }
    // author: {
    //   name: "Octokit Bot",
    //   email: "your-email",
    // },
  })

  context.res = {
    status: 200,
  }
}

export default httpTrigger
