# good-day azure functions app

For local dev:

1. `brew tap azure/functions && brew install azure-functions-core-tools@3`

2. create a `local.settings.json` with the following content:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "", // get automatically from VSCode Debug panel
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GH_API_KEY": "YOUR PAT GOES HERE", // get from good-day-bot account on GitHub
    "PG_CONN_STRING": "", // get from 1 password using table goodday
    "SLACKBOT_API_URL": "https://octo-devex.ngrok.io" or "https://octo-good-day-bot.azurewebsites.net/"
  }
}
```

3. In VSCode go to the Debug panel and click on `Attach to Node Functions` then select the Azure storage account to use for debugging `octogooddaystorage`.

4. `npm install`

5. `npm run watch` and `npm run start` in another tab