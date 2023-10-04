const TradingData = require("../../../model/TradingData");

async function organizeLaData(allData, type) {
  try {
    const {
      bullish,
      bullish_plus,
      bearish,
      bearish_plus,
      bullish_exit,
      bearish_exit,
      trand_strength,
      take_profit,
      stop_loss,
      bar_color_value,
      trend_tracer,
      trend_catcher,
      smart_trail,
      // smart_trail_extremity,
      open,
      close,
      high,
      low,
    } = allData?.data[type];

    const { name, timeframe, _id } = allData;

    let Data = {
      signal: null,
      isClose: null,
      polished_trend_catcher: null,
      take_profit,
      stop_loss,
      trand_strength,
      barColor: bar_color_value,
      smart_trail,
      trend_tracer,
      upperTail: null,
      lowerTail: null,
      entryAmaunt: null,
    };

    //   Determind the signal
    let signal = null;
    if (+bullish || +bullish_plus) {
      signal = "Long";
    } else if (+bearish || +bearish_plus) {
      signal = "Short";
    }

    //   Determind the exit or order
    let isClose = null;
    if (+bearish_exit || +bullish_exit) {
      isClose = true;
    }

    //   Prev Candle Data
    const prevCandle = await TradingData.find({ name, timeframe })
      .sort({
        createdAt: -1,
      })
      .limit(2);

    // Trand Catcher
    let trend_catcherLocal = null;
    if (prevCandle[1]) {
      let laData = prevCandle[1]?.data[type];
      if (laData) {
        trend_catcherLocal =
          +laData.trend_catcher < +trend_catcher
            ? 1
            : +laData.trend_catcher > +trend_catcher
            ? 0
            : laData.polished_trend_catcher;
      }
    }

    // Candle Tail Length
    let tailSize = {};
    let bodySize = 0;
    if (open && close && high && low) {
      tailSize = calculateTailSizePercentage({ open, close, high, low });
      bodySize = calculateBodySizePercentage({ open, close, high, low });
    }

    // Order Entry Amount
    let entryAmaunt = null;
    if (open && close && high && low) {
      const upperMiddle = (+high + Math.max(+open, +close)) / 2;
      const lowerMiddle = (+low + Math.min(+open, +close)) / 2;

      if (signal == "Long") {
        entryAmaunt = upperMiddle;
      } else if (signal == "Short") {
        entryAmaunt = lowerMiddle;
      }
    }

    Data = {
      ...Data,
      signal,
      isClose,
      entryAmaunt,
      polished_trend_catcher: trend_catcherLocal,
      bodySize,
      ...tailSize,
    };

    // Update to database
    await TradingData.findOneAndUpdate(
      { _id: _id },
      {
        $set: Object.entries(Data).reduce((update, [key, value]) => {
          update[`data.${type}.${key}`] = value;
          return update;
        }, {}),
      },
      { new: true }
    );

    return Data;
  } catch (err) {
    console.log(err);
  }
}

module.exports = organizeLaData;

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

function calculateBodySizePercentage(candle) {
  let { open, close } = candle;

  open = +open;
  close = +close;

  // Calculate the candle body size percentage compared to the close
  const bodySizePercentage = (((close - open) / close) * 100).toFixed(2);

  return +bodySizePercentage;
}
