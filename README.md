# Good Day Slack Bot - Azure Functions

Full writeup for this project is here: [https://github.com/githubocto/good-day-bot](https://github.com/githubocto/good-day-bot)

Good Day is a Slack bot that pings users every day and asks how their day was. It depends on these Azure functions for cron job tasks.

## Development

1. `brew tap azure/functions && brew install azure-functions-core-tools@3`

2. Create a `local.settings.json` with the following content:

```jsonc
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "", // get automatically from VSCode Debug panel
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GH_API_KEY": "YOUR PAT GOES HERE", // get from good-day-bot account on GitHub
    "PG_CONN_STRING": "", // get from 1 password using table goodday
    "SLACKBOT_API_URL": "https://octo-devex.ngrok.io" or "https://octo-good-day-bot.azurewebsites.net/",
    "AZURE_FUNCTIONS_ID": "", // API Key ID for slack server
    "AZURE_FUNCTIONS_SECRET": "" // API Key secret for slack server
  }
}
```

3. In VSCode go to the Debug panel and click on `Attach to Node Functions` then select the Azure storage account to use for debugging `octogooddaystorage`.

4. `npm install`

5. `npm run watch` and `npm run start` in another tab

## Building / Releasing

Deployment to the production app happens automatically when pushing to main by using a GitHub Action specified in `.github/workflows/good-day.yaml`.

Or use the [Azure Functions](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions) for dev testing work.

In both cases you also have to set the `env` variables for the Azure app through the app's configuration panel.

## License

[MIT](LICENSE)
