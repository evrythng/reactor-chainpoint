# reactor-chainpoint

This Reactor Extension script is part of [EVRYTHNG's Blockchain Integration Hub](https://developers.evrythng.com/docs/blockchain-integration-hub). It allows you to verify EVRYTHNG Actions on the blockchain via the chainPoint protocol and the Tierion API.

## Full tutorial

Available here: https://developers.evrythng.com/docs/chainpoint-integration

## Configure

* Get credentials for the [Tierion API](https://tierion.com/) and add them to `main.js`
* Create a `_blockchainValidated` ActionType for your EVRYTHNG Account
* Deploy this Reactor script in an EVRYTHNG App.

## Use

The script will react to Actions with a `blockchainValidate=true` CustomField and create a blockchain transaction for
the Action using the Tierion API. It will then schedule a Reactor function to be triggered one after the original Action.
This schedule will retrieve the transaction ID from the blockchain and will add it to a new confirmation Action (`_blockchainValidated`)

## Test

Uncomment the bottom part of `main.js` and add a Trusted Application API key to run local tests.
