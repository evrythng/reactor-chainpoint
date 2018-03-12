var createHash = require('sha.js'),
  hashclient = require('hashapi-lib-node');

var sha256 = createHash('sha256');
const username = CONFIGURE_ME;
const password = CONFIGURE_ME;
const validationActionType = '_blockchainValidated';
const validationProcessingTime = 3600000; // 1 hour

/**
 * This creates a timestamped blockchain proof of and Action
 * when the blockchainValidate customField is true.
 */
// @filter(onActionCreated) action.customFields.blockchainValidate=true
function onActionCreated(event) {
  logger.info('Blockchain validation for Action requested!');
  var hashClient = new hashclient();
  hashClient.authenticate(username, password, function (err, authToken) {
    if (err) {
      logger.error(err);
      done();
    } else {
      logger.debug('Authentication to Blockchain API successful!');
      var h = sha256.update(JSON.stringify(event.action), 'utf8').digest('hex');
      logger.debug('Action SHA256: ' + h);

      hashClient.submitHashItem(h, function (err, result) {
        if (err) {
          logger.error('Error while submitting to the blockchain --');
          logger.error(err);
          done();
        } else {
          const receipt = result.receiptId;
          logger.info('Got a blockchain receipt: ' + receipt);
          app.thng(event.action.thng).property('receiptid').update(receipt);
          // schedule reactor check in 1 hour
          app.reactor.schedule().create(createSchedule(receipt, event.action.id, event.action.thng, validationProcessingTime, "Initial check for blockchain trx")).then((schedule) => {
            logger.debug('Reactor scheduled to query blockchain at: ' + schedule.executeAt);
            logger.debug(JSON.stringify(schedule));
            done();
          }, (err) =>  {
            logger.error("Error when scheduling reactor script --");
            logger.error(JSON.stringify(err));
            done();
          });
        }
      });
    }
  });
}


/**
 * This is triggered on a schedule to retrieve confirmed Actions
 * from the blockchain.
 * Will receive:  {"receipt": receipt, "action" : event.action.id, "thng" : event.action.thng}
 */
function onScheduledEvent(event) {
  logger.info('Checking for confirmed Actions on Blockchain...');
  var hashClient = new hashclient();
  hashClient.authenticate(username, password, function (err, authToken) {
    if (err) {
      logger.error(JSON.stringify(err));
      done();
    } else {
      logger.debug('Authentication successful!');
      // retrieve the blockchain transaction - if it has been processed...
      hashClient.getReceipt(event.receipt, function (err, transaction) {
        if (err) {
          // error or the transaction hasn't been recorded yet
          logger.error("Transaction not found or hasn't been recorded --");
          logger.error(JSON.stringify(err));
          done();
        } else {
          // process transaction result
          logger.debug('Blockchain transaction found --');
          const receiptObj = JSON.parse(transaction.receipt);
          logger.debug(JSON.stringify(receiptObj));
          app.action(validationActionType).create({
            thng: event.thng,
            customFields: {"actionId" : event.action, "bitcoinTrxId": receiptObj.anchors[0].sourceId,
              "receiptId" : event.receipt, "fullReceipt" : transaction}
          }).then((action) => {
            logger.debug('Created ' + validationActionType + ' Action --');
            logger.debug(JSON.stringify(action));
            done();
          });
        }
      });
    }
  });
}

/**
 * Returns a configuration object for the reactor scheduler.
 * @param receiptId the blockchain receipt identifier
 * @param actionId identifier of the Action that was verified
 * @param thngId identifier of the Thng the Action was performed on
 * @param execInMillisec time of execution
 * @oaran description
 * @returns {{function: string, event: {receipt: *, action: *, thng: *}, executeAt: *, description: string, enabled: boolean}}
 */
function createSchedule(receiptId, actionId, thngId, execInMillisec, description) {
  const exec = Date.now() + execInMillisec;
  const schedule = {
    "function": "onScheduledEvent",
    "event": {"receipt": receiptId, "action": actionId, "thng": thngId},
    "executeAt": exec,
    "description": description,
    "enabled": true
  };
  logger.debug('Should execute at: ' + exec);
  logger.debug(JSON.stringify(schedule));
  return schedule;
}

/////////////////////////////////////////
// For local tests - REMOVE FOR REACTOR!
/////////////////////////////////////////

/*
function done() {};
var EVT = require('evrythng-extended');
var app = new EVT.TrustedApp(CONFIGURE_ME);
const  actionEvent = {"action" : {
  "id": "UnBggUASBg8RQKwwwDPy4xcn",
  "createdAt": 1518010274723,
  "customFields": {
    "blockchainValidate": true,
    "retailer": "SportsDirect"
  },
  "tags": [
    "test"
  ],
  "timestamp": 1518010274723,
  "type": "_toRetailer",
  "location": {
    "latitude": 51.515172199999995,
    "longitude": -0.0498457,
    "position": {
      "type": "Point",
      "coordinates": [
        -0.0498457,
        51.515172199999995
      ]
    }
  },
  "locationSource": "sensor",
  "context": {
    "ipAddress": "141.0.154.202",
    "city": "City of London",
    "region": "England",
    "countryCode": "GB",
    "userAgentName": "",
    "operatingSystemName": "",
    "timeZone": "Europe/London"
  },
  "createdByProject": "U2Ms4GXYMGPYhMawaDdefBpd",
  "createdByApp": "UFMPn3ECqG8hhMwRa2aM7Mhf",
  "identifiers": {},
  "thng": "UFq8n4yUMGshEMRwwkQE3bam",
  "product": "UkM8nmtCeXsa9pRaRhqQUcen"
}};
logger = console;
logger.debug = logger.info;

onScheduledEvent({"receipt": "5a8422c3e4a70229ae335c06", "thng": "UFq8n4yUMGshEMRwwkQE3bam", "action" : "UnBggUASBg8RQKwwwDPy4xcn"});
//onActionCreated(actionEvent);
*/
