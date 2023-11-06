const AsyncHandler = require('express-async-handler');
const {Telegram} = require('../../service/Telegram');
const CandleData = require('../../model/CandleData');
const { checkArrayContainsAllItems } = require('./utils');
const SETTINGS = require('./subStrategys/OneMinStr-UltraTickTrader/Settings');
const HandleUltraTickTrader = require('./subStrategys/OneMinStr-UltraTickTrader/decisionMaker');

const telegram = new Telegram(
  SETTINGS.telegramCradentials.botToken,
  SETTINGS.telegramCradentials.channelId
);

const RESTART_TIMEOUT = 2000; // Timeout before restarting the stream on error

const CANDLE_DATA_PIPELINE = [
  {
    $match: {
      $and: [
        { 'fullDocument.name': SETTINGS.strategy.name },
      ],
      $or: [
        { operationType: 'insert' },
        { operationType: 'update' },
        { operationType: 'replace' },
      ],
    },
  },
];

const CANDLE_DATA_OPTIONS = { fullDocument: 'updateLookup' };


// Checks if the provided candleData is newer than the latestCandle
function isNewCandle(latestCandle, candleData) {
    if (!latestCandle[candleData.symbol]) {
      return true;
    }
    return new Date(candleData.time) > new Date(latestCandle[candleData.symbol]);
  }
  
  // Validates if the candleData meets the criteria for making a decision
  function isValidCandleForUltraTickTrader(candleData) {
    return checkArrayContainsAllItems({
      data: SETTINGS.strategy.orderTakeKeys,
      array: candleData.type,
    });
  }
  
  // Handles the logic when a change is detected in the stream
  // This function can have multiple sub Strategy Here inside the function with own conditions
  const handleChange = (latestCandle, change) => {
    const { fullDocument: candleData } = change;
    
    if (candleData && isNewCandle(latestCandle, candleData) && isValidCandleForUltraTickTrader(candleData)) {
      latestCandle[candleData.symbol] = candleData.time; // Update the time of the latest candle
      HandleUltraTickTrader(candleData);
    }



  };

// Handles the error case for the stream
const handleError = (err) => {
  telegram.sendMessage(`Candle Db Stream has an error \n ${err} \n from ${SETTINGS.order.name}`);
  setTimeout(restartCandleDataStream, RESTART_TIMEOUT);
};

// Function to restart the stream
const restartCandleDataStream = () => {
  candleDataStream();
  telegram.sendMessage(SETTINGS.MESSAGES.restartWatching);
};

function candleDataStream() {
  let latestCandle = {};

  let candleDbStream = CandleData.watch(CANDLE_DATA_PIPELINE, CANDLE_DATA_OPTIONS);

  candleDbStream.on('change', (change) => handleChange(latestCandle, change));

  candleDbStream.on('error', handleError);
}

module.exports = {
  candleDataStream,
};
