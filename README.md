# good-day azure functions app

For local dev:

1. `brew tap azure/functions && brew install azure-functions-core-tools@3`
2. create a `local.settings.json` with the following content:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "GH_API_KEY": "YOUR PAT GOES HERE"
  }
}
```
