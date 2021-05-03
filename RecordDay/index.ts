import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Octokit } from "@octokit/rest"
import { GetResponseTypeFromEndpointMethod, GetResponseDataTypeFromEndpointMethod } from "@octokit/types";
import * as querystring from "querystring"
import { isButtonSubmit, parseSlackResponse } from './slack'
import { BlockAction } from '@slack/bolt';

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
    let response = await octokit.repos.getContent({
      owner,
      repo,
      path,
    })

    const data: GetContentResponseDataType = response.data

    if (Array.isArray(data)) {
      throw new Error(
        `path "${path}" returned an array, maybe it's a directory and not a CSV?`
      )
    }

    const sha = data.sha
    const content = 'content' in data ? data.content : ''
    const contentBuffer = Buffer.from(content, "base64").toString("utf8")
    
    return { content: contentBuffer, sha }
  } catch (error) {
    return null
  }
}

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  
  const body = querystring.parse(req.body)
  
  if (Array.isArray(body.payload)) {
    throw new Error(
      `malformed payload`
    )
  }

  const payload = JSON.parse(body.payload) as BlockAction
  const isSubmitButton = isButtonSubmit(payload)

  if (!isSubmitButton) {
    context.res = {
      status: 200,
    }
    return
  }

  // context.log(req.body)
  // context.log(JSON.stringify(payload))

  const owner = req.body.owner ? req.body.owner : 'githubocto'
  const repo = req.body.repo ? req.body.repo : 'good-day-demo'
  const path = req.body.path ? req.body.path : 'good-day.csv'

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

  let parsedPayload
  if (file) {
    // if file already exists we don't want to write headers
    parsedPayload = parseSlackResponse(payload)
  } else {
    // if a new file we want to write headeres to the file
    parsedPayload = parseSlackResponse(payload, true)
  }
  
  let fileProps =
    file === null
      ? {
          content: Buffer.from(parsedPayload + "\n").toString("base64"),
        }
      : {
          content: Buffer.from(file.content + "\n" + parsedPayload).toString("base64"),
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
