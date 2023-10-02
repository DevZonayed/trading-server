const CANDLE_TAIL_MAX_TOLARENCE = 0.2;

function signalStrengthStrategy(InitialData, candleData) {
  const {
    signal,
    isClose,
    polished_trend_catcher,
    barColor,
    upperTail,
    lowerTail,
    entryAmaunt,
  } = InitialData;

  const { name } = candleData;

  let result = {
    status: false,
    data: {
      coin: name,
      direction: null,
      exchange: "Binance Futures, ByBIt USDT",
      leverage: "Isolated 1x",
      entry: entryAmaunt,
    },
  };

  //   Order Conditions for Strength Strateg
  const shortExp = RegExp("short", "i");
  const longExp = RegExp("long", "i");

  if (
    signal == null ||
    upperTail > CANDLE_TAIL_MAX_TOLARENCE ||
    lowerTail > CANDLE_TAIL_MAX_TOLARENCE ||
    barColor == "0"
  ) {
    return result;
  }

  if (shortExp.test(signal) && polished_trend_catcher < 0) {
    result = {
      ...result,
      status: true,
      data: {
        ...result.data,
        direction: "Short",
      },
    };
  } else if (longExp.test(signal) && polished_trend_catcher > 0) {
    result = {
      ...result,
      status: true,
      data: {
        ...result.data,
        direction: "Long",
      },
    };
  }

  return result;
}

module.exports = { signalStrengthStrategy };
