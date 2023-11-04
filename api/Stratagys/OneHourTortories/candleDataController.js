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
const TYPES_FOR_ORDER_TAKE = ["default", "llb", "laso", "signal"];
const TYPES_FOR_FULL_CANDLE = ["default", "llb", "laso"];

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
const initialCandleCalculation = AsyncHandler(async (req, res, next) => {
  let candleData = parseStringToObject(req.body);

  //   Check the required data is present or not
  let isDefaultData = dataChecking({
    keys: DEFAULT_CANDLE_DATA_KEYS,
    data: candleData,
  });

  let isLasoData = dataChecking({
    keys: LASO_CANDLE_DATA_KEYS,
    data: candleData,
  });

  let isLlbData = dataChecking({
    keys: LLB_CANDLE_DATA_KEYS,
    data: candleData,
  });

  let isSignalData = dataChecking({
    keys: SIGNAL_CANDLE_DATA_KEYS,
    data: candleData,
  });

  // Required Data
  let { type, time, symbol, timeframe } = candleData
  // Updating data to database
  let updateQuery = { $addToSet: { type } };
  const setData = {};
  if (isDefaultData) {

    let { open, close, high, low, volume, candleStatus, bodySize, upperTail, lowerTail, ema, change } = candleData;

    // Entry Price Calculations
    let longEntryPrice = calculateTargetPrice(
      +close,
      SETTINGS.entryPricePercent,
      true
    );
    let shortEntryPrice = calculateTargetPrice(
      +close,
      SETTINGS.entryPricePercent,
      false
    );
    let profitZones = generateTakePrifitPrices(
      longEntryPrice,
      shortEntryPrice,
      SETTINGS.profitTakePercentage
    );

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
  } else if (isLasoData) {
    // Laso Data
    let { bullish, bullishPlus, bearish, bearishPlus, bullishExit, bearishExit, trendStrength, candleColor, trendCatcher, smartTrail } = candleData;
    
    let dateQueryForPrev = generateDateRageFilterMongoose(
      generateMultiCandleTimeRange(time, +timeframe, 3, 0)
    );
    let prevCandles = await CandleData.find({
      name: SETTINGS.strategyName,
      symbol,
      timeframe,
      time: dateQueryForPrev,
    });
    // reordering
    prevCandles = sortCandlesDescending(prevCandles)

    let trendCatcherStatus = turningBullish(prevCandles , "data.trendCatcher") ? "Long" : turningBearish(prevCandles , "data.trendCatcher") ? "Short" : prevCandles[1]?.data?.trendCatcherStatus;
    // Detact Smart Trail Shift
    let smartTrailStatus = turningBullish(prevCandles , "data.smartTrail") ? "Long" : turningBearish(prevCandles , "data.smartTrail") ? "Short" : prevCandles[1]?.data?.smartTrailStatus;
    
    // Detact Trend Catcher Shift
    let trendCatcherShift = trendCatcherStatus == "Long" && prevCandles[0]?.data?.trendCatcherStatus == "Short" ? "Long" : trendCatcherStatus == "Short" && prevCandles[0]?.data?.trendCatcherStatus == "Long" ? "Short" : null;

    // Detact Smart Trail Shift
    let smartTrailShift = smartTrailStatus == "Long" && prevCandles[0]?.data?.smartTrailStatus == "Short" ? "Long" : smartTrailStatus == "Short" && prevCandles[0]?.data?.smartTrailStatus == "Long" ? "Short" : null;
  

    
    
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
      "data.trendCatcherShift": trendCatcherShift,
      "data.trendCatcherStatus": trendCatcherStatus,
      "data.smartTrailShift": smartTrailShift,
      "data.smartTrailStatus": smartTrailStatus,
    });



  } else if (isLlbData) {
    // Manage LLb Data
    let { strongBullish, strongBearish, consensus, histogram, signalLine, macdLine, signalLineCross, upper, lower, average, obOne, osOne, obTwo, osTwo, wtgl, wtrl } = candleData;
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
      "data.wtrl": wtrl
    });
  } else if (isSignalData) {
    let { long, short } = candleData;
    Object.assign(setData, {
      "data.long": long,
      "data.short": short,
    });
  } else {
    console.log("Unknown Data Pushed")
    console.log(candleData)
    return res.json({
      message: "Unknown Data"
    })
  }
  if (Object.keys(setData).length) {
    updateQuery.$set = setData;
  }
  // Date Query Filter
  // let dateQuery = generateDateRageFilterMongoose(generateTimeRange(time, 0.5));
  let newCandle = await CandleData.findOneAndUpdate(
    { symbol, time: new Date(time), timeframe, name: SETTINGS.strategyName },
    updateQuery,
    {
      new: true,
      upsert: true,
    }
  );
  // Telegram info
  let candleFullfilled = checkArrayContainsAllItems({
    data: TYPES_FOR_FULL_CANDLE,
    array: newCandle.type,
  });



  if (candleFullfilled) {
    const {_id ,__v, ...rest} = newCandle.toObject()
    telegram.sendMessage(objectToString(rest))
    console.log("Message should send")
  }

  // Rest of the calculation pass will be here
  res.json({
    message: "Success",
  });
});


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
function generateTakePrifitPrices(upperEntry, lowerEntry, percentageArr) {
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
