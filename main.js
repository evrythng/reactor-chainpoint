const createHash = require('sha.js');
const HashClient = require('hashapi-lib-node');

const USERNAME = '';
const PASSWORD = '';
const ACTION_TYPE_VALIDATION = '_blockchainValidated';
const VALIDATION_WAIT_MS = 1 * 60 * 60 * 1000;  // 1 hour

const hashClient = new HashClient();
const sha256 = createHash('sha256');

const promiseCb = (err, result, resolve, reject) => {
  if (err) {
    reject(err);
    return;
  }

  resolve(result);
};

const authenticate = () => new Promise((resolve, reject) => {
  hashClient.authenticate(USERNAME, PASSWORD, (err, res) => promiseCb(err, res, resolve, reject));
});

const getReceipt = arg => new Promise((resolve, reject) => {
  hashClient.getReceipt(arg, (err, res) => promiseCb(err, res, resolve, reject));
});

const submitHashItem = arg => new Promise((resolve, reject) => {
  hashClient.submitHashItem(arg, (err, res) => promiseCb(err, res, resolve, reject));
});

/**
 * This creates a timestamped blockchain proof of an Action when the blockchainValidate
 * customField is true.
 */
const submitHashToBlockchain = (action) => {
  const hash = sha256.update(JSON.stringify(action), 'utf8').digest('hex');
  logger.debug(`Action SHA256: ${hash}`);

  return submitHashItem(hash).then((result) => {
    const receipt = result.receiptId;

    // Set the receipt ID
    app.thng(action.thng).property('receiptid').update(receipt);

    // Schedule reactor check in 1 hour
    const event = { receipt, action: action.id, thng: action.thng };
    logger.debug(`event: ${JSON.stringify(event)}`);
    return app.reactor.schedule().create({
      event,
      executeAt: Date.now() + VALIDATION_WAIT_MS,
      description: 'Initial check for blockchain trx',
    });
  });
};

/**
 * Retrieve the blockchain transaction, if it has been processed.
 *
 * This is triggered on a schedule to retrieve confirmed Actions from the blockchain.
 * Will receive: event: { receipt, action, thng }
 */
const createValidationAction = event => getReceipt(event.receipt).then((transaction) => {
  logger.info(`Blockchain transaction: ${JSON.stringify(transaction)}`);
  const receiptObj = JSON.parse(transaction.receipt);

  return app.action(ACTION_TYPE_VALIDATION).create({
    thng: event.thng,
    customFields: {
      actionId: event.action,
      bitcoinTrxId: receiptObj.anchors[0].sourceId,
      receiptId: event.receipt,
      fullReceipt: transaction,
    },
  });
});

const handleError = err => logger.error(err.message ? err.message : JSON.stringify(err));

// @filter(onActionCreated) action.customFields.blockchainValidate=true
function onActionCreated(event) {
  logger.info('Blockchain validation for action requested!');

  authenticate()
    .then(() => submitHashToBlockchain(event.action))
    .then(schedule => logger.info(`Reactor scheduled for ${schedule.executeAt}`))
    .catch(handleError)
    .then(done);
}

function onScheduledEvent(event) {
  logger.info('Checking for confirmed actions on blockchain...');

  authenticate()
    .then(() => createValidationAction(event))
    .then(action => logger.info(`Created ${ACTION_TYPE_VALIDATION} action: ${action.id}`))
    .catch(handleError)
    .then(done);
}


/////////////////////////////////////////
// For local tests - REMOVE FOR REACTOR!
/////////////////////////////////////////

/*
function done() {};
const EVT = require('evrythng-extended');
const app = new EVT.TrustedApp('');
logger = console;
logger.debug = logger.info;

const actionEvent = {
  action: {
    id: 'UnBggUASBg8RQKwwwDPy4xcn',
    createdAt: 1518010274723,
    customFields: {
      blockchainValidate: true,
      retailer: 'SportsDirect'
    },
    tags: [
      'test'
    ],
    timestamp: 1518010274723,
    type: '_toRetailer',
    location: {
      latitude: 51.515172199999995,
      longitude: -0.0498457,
      position: {
        type: 'Point',
        coordinates: [
          -0.0498457,
          51.515172199999995
        ]
      }
    },
    locationSource: 'sensor',
    context: {
      ipAddress: '141.0.154.202',
      city: 'City of London',
      region: 'England',
      countryCode: 'GB',
      userAgentName: '',
      operatingSystemName: '',
      timeZone: 'Europe/London'
    },
    createdByProject: 'U2Ms4GXYMGPYhMawaDdefBpd',
    createdByApp: 'UFMPn3ECqG8hhMwRa2aM7Mhf',
    identifiers: {},
    thng: 'UFq8n4yUMGshEMRwwkQE3bam',
    product: 'UkM8nmtCeXsa9pRaRhqQUcen'
  }
}};

// onScheduledEvent({
//   receipt: '5a8422c3e4a70229ae335c06',
//   thng: 'UFq8n4yUMGshEMRwwkQE3bam',
//   action: 'UnBggUASBg8RQKwwwDPy4xcn'
// });
// onActionCreated(actionEvent);
*/
