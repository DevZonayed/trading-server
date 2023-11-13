const CandleData = require("../../model/CandleData");
const AsyncHandler = require("express-async-handler");
const { parseStringToObject } = require("../../helper/stringToObject");
const {
  dataChecking,
  generateDateRageFilterMongoose,
  generateTimeRange,
  generateMultiCandleTimeRange,
  checkArrayContainsAllItems,
  objectToString,
  sortCandlesDescending,
} = require("./utils");
const { Telegram } = require("../../service/Telegram");
const SETTINGS = require("./Settings");



// symbol = BTCUSDT 
// time = {{time}} 
// type = llb 
// timeframe = {{interval}} 
// strongBullish ={{plot("Strong Bullish")}} 
// strongBearish = {{plot("Strong Bearish")}} 
// consensus = {{plot("Consensus")}} 
// histogram = {{plot("Histogram")}} 
// signalLine = {{plot("Signal Line")}} 
// macdLine = {{plot("MACD Line")}} 
// signalLineCross = {{plot("Crossing")}} 
// upper = {{plot("Upper")}} 
// lower = {{plot("Lower")}} 
// average = {{plot("Average")}} 
// hullLongShift = {{plot("turnGreen")}} 
// hullShortShift = {{plot("turnRed")}} 
// hullLong = {{plot("Hull Green")}} 
// hullShort = {{plot("Hull Red")}}


const REQUIRED_DATA_KEYS = ["symbol", "time", "type", "timeframe"];
const DEFAULT_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "open", "close", "high", "low", "volume", "ema", "change", "candleStatus", "bodySize", "upperTail", "lowerTail"];
const LLB_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "strongBullish", "strongBearish", "consensus", "histogram", "signalLine", "macdLine", "signalLineCross", "upper", "lower", "hullLongShift", "hullShortShift", "hullLong", "hullShort"];


const LLB10_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "hullLongShift10", "hullShortShift10", "hullLong10", "hullShort10", "strongBullish10", "strongBearish10", "long10", "short10"];

const TYPES_FOR_FULL_CANDLE = ["default", "llb", "llb10"];


const telegram = new Telegram(SETTINGS.telegramCradentials.botToken, SETTINGS.telegramCradentials.channelId)






/**
 * @Route = "root/api/v1/candle-data"
 * @method =POST
 * @access Public
 * @description This Controller will work as controller middleware that is handle basic candle data
 */
const initialCandleCalculation = AsyncHandler(async (req, res) => {
  const candleData = parseStringToObject(req.body);
  const updateQuery = { $addToSet: { type: candleData.type } };
  const setData = {};

  // Check the required data presence
  if (!isDataValid(candleData)) {
    console.log("Unknown Data Pushed", candleData);
    return res.json({ message: "Unknown Data" });
  }

  // Depending on the data, process accordingly
  await processDataByType(candleData, setData);

  if (Object.keys(setData).length) {
    updateQuery.$set = setData;
  }

  const newCandle = await updateCandleData(candleData, updateQuery);

  // Send Telegram message if the candle is fulfilled
  if (isNewCandleFulfilled(newCandle)) {
    // sendTelegramMessage(newCandle);
  }

  res.json({ message: "Success" });
});

function isDataValid(candleData) {
  return (
    dataChecking({ keys: DEFAULT_CANDLE_DATA_KEYS, data: candleData }) ||
    dataChecking({ keys: LLB_CANDLE_DATA_KEYS, data: candleData }) ||
    dataChecking({ keys: LLB10_CANDLE_DATA_KEYS, data: candleData })
  );
}

async function processDataByType(candleData, setData) {
  if (dataChecking({ keys: DEFAULT_CANDLE_DATA_KEYS, data: candleData })) {
    await processDefaultData(candleData, setData);
  } else if (dataChecking({ keys: LLB10_CANDLE_DATA_KEYS, data: candleData })) {
    await processLlb10Data(candleData, setData);
  } else if (dataChecking({ keys: LLB_CANDLE_DATA_KEYS, data: candleData })) {
    await processLlbData(candleData, setData);

    // THis is for proccess Llb10 data also according to previous candle
    let { timeframe, symbol } = candleData
    let LLB10Data = await fetchPreviousCandles({ timeframe, symbol })
    let { hullLongShift10, hullShortShift10, long10, short10, ...restData } = LLB10Data[1]?.data
    await processLlb10Data(restData, setData)
  }
}

async function updateCandleData(candleData, updateQuery) {
  return CandleData.findOneAndUpdate(
    {
      symbol: candleData.symbol,
      time: new Date(candleData.time),
      timeframe: candleData.timeframe,
      name: SETTINGS.strategy.name
    },
    updateQuery,
    { new: true, upsert: true }
  );
}

function isNewCandleFulfilled(newCandle) {
  return checkArrayContainsAllItems({
    data: TYPES_FOR_FULL_CANDLE,
    array: newCandle.type,
  });
}


async function processDefaultData(candleData, setData) {
  const {
    open, close, high, low, volume, candleStatus, bodySize, upperTail, lowerTail, ema, change,
  } = candleData;

  const longEntryPrice = calculateTargetPrice(+close, SETTINGS.entryPricePercent, true);
  const shortEntryPrice = calculateTargetPrice(+close, SETTINGS.entryPricePercent, false);
  const profitZones = calculateTakeProfitPrices(longEntryPrice, shortEntryPrice, SETTINGS.profitTakePercentage);

  Object.assign(setData, {
    open: +open,
    close: +close,
    high: +high,
    low: +low,
    volume: +volume,
    candleStatus: +candleStatus,
    bodySize: +bodySize,
    upperTail: +upperTail,
    lowerTail: +lowerTail,
    ema: +ema,
    change: +change,
    longEntryPrice: +longEntryPrice,
    shortEntryPrice: +shortEntryPrice,
    longProfitTakeZones: profitZones.longProfitTakeZones,
    shortProfitTakeZones: profitZones.shortProfitTakeZones
  });
}

async function processLlb10Data(candleData, setData) {
  try {
    const {
      hullLongShift10,
      hullShortShift10,
      long10,
      short10,
      hullLong10,
      hullShort10,
      strongBullish10,
      strongBearish10,
    } = candleData;


    Object.assign(setData, {
      "data.hullLongShift10": !!hullLongShift10 ? hullLongShift10 : null,
      "data.hullShortShift10": !!hullShortShift10 ? hullShortShift10 : null,
      "data.hullLong10": !!hullLong10 ? hullLong10 : null,
      "data.hullShort10": !!hullShort10 ? hullShort10 : null,
      "data.strongBullish10": !!strongBullish10 ? strongBullish10 : null,
      "data.strongBearish10": !!strongBearish10 ? strongBearish10 : null,
      "data.long10": !!long10 ? long10 : null,
      "data.short10": !!short10 ? short10 : null
    });
  } catch (err) {
    telegram.sendMessage("There is an error in laso10 data \n" + err)
  }
}

async function processLlbData(candleData, setData) {
  const {
    strongBullish, strongBearish, consensus, histogram, signalLine, macdLine, signalLineCross, upper, lower, average, hullLongShift, hullShortShift, hullLong, hullShort
  } = candleData;

  let aiChannelStatus = determineAiChannelStatus(candleData);
  Object.assign(setData, {
    "data.strongBullish": strongBullish,
    "data.strongBearish": strongBearish,
    "data.consensus": consensus,
    "data.histogram": histogram,
    "data.signalLine": signalLine,
    "data.macdLine": macdLine,
    "data.signalLineCross": signalLineCross,
    "data.upper": upper,
    "data.lower": lower,
    "data.aiChannelStatus": aiChannelStatus,
    "data.average": average,
    "data.hullLongShift": hullLongShift,
    "data.hullShortShift": hullShortShift,
    "data.hullLong": hullLong,
    "data.hullShort": hullShort
  });
}

// Utility Functions:

async function fetchPreviousCandles({ timeframe, symbol }) {
  try {
    let prevCandles = await CandleData.find({
      name: SETTINGS.strategy.name,
      symbol,
      timeframe,
    }).sort({ createdAt: -1 }).limit(3);

    return sortCandlesDescending(prevCandles);
  } catch (err) {
    console.error("there is an error while fatching previous candle data" + err)
  }
}

function determineAiChannelStatus(candleData) {
  const {
    upper, lower
  } = candleData;

  let aiChannelStatus = !!upper ? "Long" : !!lower ? "Short" : null;
  return aiChannelStatus;
}


/**
 * @Route = "root/api/v1/candle-data"
 * @method = POST
 * @access Public
 * @description This Controller will work as controller middleware that is handle Orders
 */
const handleOrderCreation = AsyncHandler(async (req, res, next) => {
  const signal = req.signal
  if (!signal) return next()
  const currentData = req.currentData

  const {
    longProfitTakeZones,
    shortProfitTakeZones,
    longEntryPrice,
    shortEntryPrice,
    symbol
  } = currentData

  let profitTakeZones = /Short/i.test(signal) ? shortProfitTakeZones : longProfitTakeZones
  let entryPrice = /Short/i.test(signal) ? shortEntryPrice : longEntryPrice
  let exchange = "Binance Futures, ByBIt USDT"
  let leverage = "Isolated 1x"
  // Send to telegram
  telegram.createOrder({ coin: symbol, direction: signal, entry: entryPrice, leverage, exchange, targets: profitTakeZones })
})





const CandleDataController = {
  initialCandleCalculation,
  handleOrderCreation
};
module.exports = CandleDataController;


// Generate Profit Zones
function calculateTakeProfitPrices(upperEntry, lowerEntry, percentageArr) {
  let longProfitTakeZones = percentageArr.map((percentage) =>
    calculateTargetPrice(upperEntry, percentage, true)
  );
  let shortProfitTakeZones = percentageArr.map((percentage) =>
    calculateTargetPrice(lowerEntry, percentage, false)
  );
  return {
    longProfitTakeZones,
    shortProfitTakeZones,
  };
}
// Calculate The proofit prices
function calculateTargetPrice(entryPrice, profitPercentage, isLongOrder) {
  const decimalProfitPercentage = profitPercentage / 100;
  const priceThreshold = entryPrice * decimalProfitPercentage;

  if (isLongOrder) {
    return Math.round((entryPrice + priceThreshold) * 10000) / 10000;
  } else {
    return Math.round((entryPrice - priceThreshold) * 10000) / 10000;
  }
}
