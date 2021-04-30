import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Octokit } from "@octokit/rest"
import { GetResponseTypeFromEndpointMethod, GetResponseDataTypeFromEndpointMethod } from "@octokit/types";

const key = process.env["GH_API_KEY"]
if (typeof key === "undefined") {
  throw new Error(
    `need a valid github API key`
  )
}
const octokit = new Octokit({
  auth: key
})

type GetContentResponseType = GetResponseTypeFromEndpointMethod<
  typeof octokit.repos.getContent
>;
type GetContentResponseDataType = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.repos.getContent
>;

interface ContentResponse {
  content: string
  sha: string
}

const getContent = async function (owner: string, repo: string, path: string): Promise<ContentResponse> | null {
  try {
    console.log("trying response")
    let response = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })

    console.log("after response")

    const data: GetContentResponseDataType = response.data

    if (Array.isArray(data)) {
      throw new Error(
        `path "${path}" returned an array, maybe it's a directory and not a CSV?`
      )
    }

    const sha = data.sha
    // @ts-ignore
    const content = Buffer.from(data.content || "", "base64").toString("utf8")

    return { content, sha }
  } catch (error) {
    return null
  }
}

const headerRow = 'date,foo,bar,baz\n'

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  
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

  let file: ContentResponse
  try {
    file = await getContent(owner, repo, path)
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
          content: Buffer.from(file.content + "\n" + payload).toString("base64"),
          sha: file.sha,
        }
  const { data } = await octokit.repos.createOrUpdateFileContents({
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
