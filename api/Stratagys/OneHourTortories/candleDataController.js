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
  upperCross,
  underCross,
  turningBullish,
  turningBearish,
} = require("./utils");
const { Telegram } = require("../../service/Telegram");

const REQUIRED_DATA_KEYS = ["symbol", "time", "type", "timeframe"];
const DEFAULT_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "open", "close", "high", "low", "volume", "ema", "change", "candleStatus", "bodySize", "upperTail", "lowerTail"];
const LLB_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "strongBullish", "strongBearish", "consensus", "histogram", "signalLine", "macdLine", "signalLineCross", "upper", "lower", "average", "obOne", "osOne", "obTwo", "osTwo", "wtgl", "wtrl"];
const LASO_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "bullish", "bullishPlus", "bearish", "bearishPlus", "bullishExit", "bearishExit", "trendStrength", "candleColor", "trendCatcher", "smartTrail"];
const SIGNAL_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "long", "short"];
const SMART_TRAIL_STATUS_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "smartTrailUptrading", "smartTrailDowntrading"];
const TREND_CATCHER_STATUS_CANDLE_DATA_KEYS = [...REQUIRED_DATA_KEYS, "trendCatcherUptrading", "trendCatcherDowntrading"];
const TYPES_FOR_ORDER_TAKE = ["default", "llb", "laso", "signal"];
const TYPES_FOR_FULL_CANDLE = ["default", "llb", "laso" , "tcst", "stst"];

const SETTINGS = {
  strategyName: "Tortoris_1h",
  telegramCradentials: {
    botToken: "6465687056:AAFAoET1Ln3zRRutTy6nvlfT2FAeVvJscMI",
    channelId: "-1002086222625"
  },
  entryPricePercent: 0.02,
  profitTakePercentage: [0.10, 0.30, 1]
}


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
  processDataByType(candleData, setData);

  if (Object.keys(setData).length) {
    updateQuery.$set = setData;
  }

  const newCandle = await updateCandleData(candleData, updateQuery);

  // Send Telegram message if the candle is fulfilled
  if (isNewCandleFulfilled(newCandle)) {
    sendTelegramMessage(newCandle);
  }

  res.json({ message: "Success" });
});

function isDataValid(candleData) {
  return (
    dataChecking({ keys: DEFAULT_CANDLE_DATA_KEYS, data: candleData }) ||
    dataChecking({ keys: LASO_CANDLE_DATA_KEYS, data: candleData }) ||
    dataChecking({ keys: LLB_CANDLE_DATA_KEYS, data: candleData }) ||
    dataChecking({ keys: SIGNAL_CANDLE_DATA_KEYS, data: candleData }) ||
    dataChecking({ keys: SMART_TRAIL_STATUS_CANDLE_DATA_KEYS, data: candleData }) ||
    dataChecking({ keys: TREND_CATCHER_STATUS_CANDLE_DATA_KEYS, data: candleData })
  );
}

function processDataByType(candleData, setData) {
  if (dataChecking({ keys: DEFAULT_CANDLE_DATA_KEYS, data: candleData })) {
    processDefaultData(candleData, setData);
  } else if (dataChecking({ keys: LASO_CANDLE_DATA_KEYS, data: candleData })) {
    processLasoData(candleData, setData);
  } else if (dataChecking({ keys: LLB_CANDLE_DATA_KEYS, data: candleData })) {
    processLlbData(candleData, setData);
  } else if (dataChecking({ keys: SIGNAL_CANDLE_DATA_KEYS, data: candleData })) {
    processSignalData(candleData, setData);
  }else if(dataChecking({ keys: SMART_TRAIL_STATUS_CANDLE_DATA_KEYS, data: candleData })){
    processSmartTrailData(candleData, setData)
  }else if (dataChecking({ keys: TREND_CATCHER_STATUS_CANDLE_DATA_KEYS, data: candleData })){
    processTrendCatcherData(candleData, setData)
  }
}

async function updateCandleData(candleData, updateQuery) {
  return CandleData.findOneAndUpdate(
    {
      symbol: candleData.symbol,
      time: new Date(candleData.time),
      timeframe: candleData.timeframe,
      name: SETTINGS.strategyName
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

function sendTelegramMessage(newCandle) {
  const { _id, __v, ...rest } = newCandle.toObject();
  telegram.sendMessage(objectToString(rest));
  console.log("Message should send");
}


async function processDefaultData(candleData, setData) {
  const {
    open, close, high, low, volume, candleStatus, bodySize, upperTail, lowerTail, ema, change,
  } = candleData;

  const longEntryPrice = calculateTargetPrice(+close, SETTINGS.entryPricePercent, true);
  const shortEntryPrice = calculateTargetPrice(+close, SETTINGS.entryPricePercent, false);
  const profitZones = generateTakeProfitPrices(longEntryPrice, shortEntryPrice, SETTINGS.profitTakePercentage);

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

async function processLasoData(candleData, setData) {
  const {
    bullish, bullishPlus, bearish, bearishPlus, bullishExit, bearishExit, trendStrength, candleColor, trendCatcher, smartTrail
  } = candleData;

  const prevCandles = await fetchPreviousCandles(candleData);

  const trendCatcherStatus = determineTrendCatcherStatus(prevCandles);
  const smartTrailStatus = determineSmartTrailStatus(prevCandles);

  Object.assign(setData, {
    "data.bullish": bullish,
    "data.bullishPlus": bullishPlus,
    "data.bearish": bearish,
    "data.bearishPlus": bearishPlus,
    "data.bullishExit": bullishExit,
    "data.bearishExit": bearishExit,
    "data.trendStrength": trendStrength,
    "data.candleColor": candleColor,
    "data.trendCatcher": trendCatcher,
    "data.smartTrail": smartTrail,
    "data.trendCatcherStatus": trendCatcherStatus.current,
    "data.trendCatcherShift": trendCatcherStatus.shift,
    "data.smartTrailStatus": smartTrailStatus.current,
    "data.smartTrailShift": smartTrailStatus.shift,
  });
}

async function processLlbData(candleData, setData) {
  const {
    strongBullish, strongBearish, consensus, histogram, signalLine, macdLine, signalLineCross, upper, lower, average, obOne, osOne, obTwo, osTwo, wtgl, wtrl
  } = candleData;

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
    "data.average": average,
    "data.obOne": obOne,
    "data.osOne": osOne,
    "data.obTwo": obTwo,
    "data.osTwo": osTwo,
    "data.wtgl": wtgl,
    "data.wtrl": wtrl,
  });
}

function processSignalData(candleData, setData) {
  const { long, short } = candleData;
  Object.assign(setData, {
    "data.long": long,
    "data.short": short,
  });
}

// this funtion will handle smart trail status
function processSmartTrailData(candleData, setData) {
  const { smartTrailUptrading, smartTrailDowntrading } = candleData;
  let status = smartTrailUptrading ? "Long" : smartTrailDowntrading ? "Short" : null
  Object.assign(setData, {
    "data.smartTrailStatus": status,
  });
}

// this funtion will handle Trend Catcher status
function processTrendCatcherData(candleData, setData) {
  const { trendCatcherUptrading, trendCatcherDowntrading } = candleData;
  let status = trendCatcherUptrading ? "Long" : trendCatcherDowntrading ? "Short" : null
  Object.assign(setData, {
    "data.trendCatcherStatus": status,
  });
}

// Utility Functions:

async function fetchPreviousCandles({ time, timeframe, symbol }) {
  const dateQueryForPrev = generateDateRangeFilterMongoose(
    generateMultiCandleTimeRange(time, +timeframe, 3, 0)
  );

  let prevCandles = await CandleData.find({
    name: SETTINGS.strategyName,
    symbol,
    timeframe,
    time: dateQueryForPrev,
  });

  return sortCandlesDescending(prevCandles);
}

function determineTrendCatcherStatus(prevCandles) {
  const status = turningBullish(prevCandles, "data.trendCatcher") ? "Long"
    : turningBearish(prevCandles, "data.trendCatcher") ? "Short"
    : prevCandles[1]?.data?.trendCatcherStatus;

  const shift = status === "Long" && prevCandles[0]?.data?.trendCatcherStatus === "Short" ? "Long"
    : status === "Short" && prevCandles[0]?.data?.trendCatcherStatus === "Long" ? "Short"
    : undefined;

  return { current: status, shift };
}

function determineSmartTrailStatus(prevCandles) {
  const status = increasingValue(prevCandles, "data.smartTrail") ? "Long"
    : decreasingValue(prevCandles, "data.smartTrail") ? "Short"
    : prevCandles[1]?.data?.smartTrailStatus;

  const shift = status === "Long" && prevCandles[0]?.data?.smartTrailStatus === "Short" ? "Long"
    : status === "Short" && prevCandles[0]?.data?.smartTrailStatus === "Long" ? "Short"
    : undefined;

  return { current: status, shift };
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
function generateTakeProfitPrices(upperEntry, lowerEntry, percentageArr) {
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
  if (isLongOrder) {
    return entryPrice * (1 + profitPercentage / 100);
  } else {
    return entryPrice * (1 - profitPercentage / 100);
  }
}
