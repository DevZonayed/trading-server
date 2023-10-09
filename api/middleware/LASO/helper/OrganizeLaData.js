const TradingData = require("../../../model/TradingData");

async function organizeLaData(allData) {
  try {
    const { name, timeframe, open, close, high, low, _id, type } = allData;
    const {
      bullish,
      bullish_plus,
      bearish,
      bearish_plus,
      bullish_exit,
      bearish_exit,
      trand_strength,
      bar_color_value,
      trend_tracer,
      trend_catcher,
      smart_trail,
    } = allData?.data[type];

    let Data = {
      signal: null,
      isClose: null,
      polished_trend_catcher: null,
      polished_smart_trail: null,
      trand_strength,
      barColor: Number(bar_color_value),
      trend_tracer,
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
    const prevCandles = await TradingData.find({ name, timeframe })
      .sort({
        createdAt: -1,
      })
      .limit(6);

    // Trand Catcher
    let trand_catcherLocal = null;
    let smart_trailLocal = null;
    if (prevCandles[1]) {
      let laData = prevCandles[1]?.data[type];
      if (laData) {
        // Trand Catcher Local
        trand_catcherLocal =
          +laData.trend_catcher < +trend_catcher
            ? 1
            : +laData.trend_catcher > +trend_catcher
            ? 0
            : laData.polished_trend_catcher;

        // Smart trail Local
        smart_trailLocal =
          +laData.smart_trail < +smart_trail
            ? 1
            : +laData.smart_trail > +smart_trail
            ? 0
            : laData.polished_smart_trail;
      }
    }

    // Previous Candle Interection
    let prevCandleData = [...prevCandles].slice(1);
    let prevLaData = prevCandleData.map((candleData) => {
      return candleData.data[type];
    });

    let laSTData = prevLaData.map((item) => ({
      smart_trail: item?.polished_smart_trail,
      trand_catcher: item?.polished_trend_catcher,
    }));

    let isTrandCatcherStraight = allElementsAreEqual(
      laSTData.map((item) => item.trand_catcher)
    );
    let isSmartTrailStraight = allElementsAreEqual(
      laSTData.map((item) => item.smart_trail)
    );

    let trandCatcherShift = !allElementsAreEqual([
      laSTData[0]?.trand_catcher,
      trand_catcherLocal,
    ])
      ? laSTData[0]?.trand_catcher < trand_catcherLocal
        ? "Long"
        : "Short"
      : false;

    let smartTrailShift = !allElementsAreEqual([
      laSTData[0]?.smart_trail,
      smart_trailLocal,
    ])
      ? laSTData[0]?.smart_trail < smart_trailLocal
        ? "Long"
        : "Short"
      : false;

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
      polished_trend_catcher: trand_catcherLocal,
      polished_smart_trail: smart_trailLocal,
      trandCatcherShift,
      smartTrailShift,
      isTrandCatcherStraight,
      isSmartTrailStraight,
    };

    // Update to database
    let updatedData = await TradingData.findOneAndUpdate(
      { _id: _id },
      {
        $set: Object.entries(Data).reduce((update, [key, value]) => {
          update[`data.${type}.${key}`] = value;
          return update;
        }, {}),
      },
      { new: true }
    );

    return updatedData;
  } catch (err) {
    console.log(err);
  }
}

module.exports = organizeLaData;

// Check all the item is equal or not
function allElementsAreEqual(array) {
  if (array.every((el) => el === undefined)) {
    return false;
  }
  for (let i = 1; i < array.length; i++) {
    if (array[i] !== array[0]) {
      return false;
    }
  }
  return true;
}
