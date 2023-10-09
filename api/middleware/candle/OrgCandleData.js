const { csvStringToObject } = require("../../helper/phoneNumberFormater");
const AsyncHandler = require("express-async-handler");
const TradingData = require("../../model/TradingData");
const { parseStringToObject } = require("../../helper/stringToObject");

const PROFIT_TAKE_PERCENTAGE = [0.3, 1, 3];

const OrgCandleData = AsyncHandler(async (req, res, next) => {
  // let bodyData = csvStringToObject(req.body)[0];
  let bodyData = parseStringToObject(req.body);
  let { open, close, high, low, time, timeframe, name, ...restData } = bodyData;
  //   Main Conditions
  if (open && close && high && low && time && timeframe && name) {
    let tailSize = calculateTailSizePercentage({ open, close, high, low });
    let bodySize = calculateBodySizePercentage({ open, close, high, low });
    let upperTailMiddlePrice = (+high + Math.max(+open, +close)) / 2;
    let lowerTailMiddlePrice = (+low + Math.min(+open, +close)) / 2;

    // Includes longProfitTakeZones, shortProfitTakeZones,
    let profitZones = generateTakePrifitPrices(
      upperTailMiddlePrice,
      lowerTailMiddlePrice,
      PROFIT_TAKE_PERCENTAGE
    );
    let candleData = {
      name,
      time: new Date(time),
      timeframe: +timeframe,
      open: +open,
      close: +close,
      high: +high,
      low: +low,
      bodySize,
      upperTail: tailSize.upperTail,
      lowerTail: tailSize.lowerTail,
      upperTailMiddlePrice,
      lowerTailMiddlePrice,
      ...profitZones,
      data: restData,
    };

    let { data, ...rootCandleData } = candleData;
    let { type, ...indicatorData } = data;

    if (!type) {
      return res.status(400).json({
        message: "Type Not Found!",
      });
    }

    // Construct the update query
    const updateQuery = {
      ...rootCandleData,
      $set: {},
    };

    // Set the nested object in the data field based on the type key
    updateQuery.$set[`data.${type}`] = indicatorData;
    let updatedCandle = await TradingData.findOneAndUpdate(
      { name, time: candleData.time, timeframe },
      updateQuery,
      {
        new: true,
        upsert: true,
      }
    );

    req.candle = {
      ...updatedCandle.toObject(),
      type,
    };
    next();
  } else {
    res.status(400).json({
      message: "Data not valid",
    });
  }
});

module.exports = { OrgCandleData };

/**
 * This function will generate profit take zones for long and short signals
 * @param {*} upperEntry
 * @param {*} lowerEntry
 * @param {*} percentageArr
 * @returns
 */
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

/**
 * Calcualte the upper tail and lower tail percentage
 * @param {Candle Data} candle
 * @returns
 */
function calculateTailSizePercentage(candle) {
  let { open, close, high, low } = candle;

  open = +open;
  close = +close;
  high = +high;
  low = +low;

  // Calculate the upper and lower tails
  const upperTail = high - Math.max(open, close);
  const lowerTail = Math.min(open, close) - low;

  // Calculate the tail size percentage compared to the close
  const upperTailPercentage = ((upperTail / close) * 100).toFixed(2);
  const lowerTailPercentage = ((lowerTail / close) * 100).toFixed(2);

  return { upperTail: +upperTailPercentage, lowerTail: +lowerTailPercentage };
}

/**
 * Clculate candle body percentage
 * @param {*} candle
 * @returns
 */
function calculateBodySizePercentage(candle) {
  let { open, close } = candle;

  open = +open;
  close = +close;

  // Calculate the candle body size percentage compared to the close
  const bodySizePercentage = (((close - open) / close) * 100).toFixed(2);
  return Math.abs(+bodySizePercentage);
}

/**
 * Calculate target price for take profit
 * @param {*} entryPrice
 * @param {*} profitPercentage
 * @param {*} isLongOrder
 * @returns
 */
function calculateTargetPrice(entryPrice, profitPercentage, isLongOrder) {
  if (isLongOrder) {
    return entryPrice * (1 + profitPercentage / 100);
  } else {
    return entryPrice * (1 - profitPercentage / 100);
  }
}
