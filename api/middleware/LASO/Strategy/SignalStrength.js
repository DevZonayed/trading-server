const CANDLE_TAIL_MAX_TOLARENCE = 0.5;
const MIN_CANDLE_BODY_FOR_TAIL_CONDITION = 1;
const TARGET_PERCENTAGE = 3;

function signalStrengthStrategy(InitialData, candleData) {
  const {
    signal,
    isClose,
    polished_trend_catcher,
    barColor,
    upperTail,
    lowerTail,
    bodySize,
    entryAmaunt,
  } = InitialData;

  //   Order Conditions for Strength Strateg
  const shortExp = RegExp("short", "i");
  const longExp = RegExp("long", "i");

  const { name } = candleData;

  let result = {
    status: false,
    data: {
      coin: name,
      direction: null,
      exchange: "Binance Futures, ByBIt USDT",
      leverage: "Isolated 1x",
      entry: entryAmaunt,
      target: calculateTargetPrice(
        +entryAmaunt,
        TARGET_PERCENTAGE,
        longExp.test(signal)
      ),
    },
  };

  if (
    signal == null ||
    barColor == "0" ||
    (bodySize >= MIN_CANDLE_BODY_FOR_TAIL_CONDITION &&
      upperTail > CANDLE_TAIL_MAX_TOLARENCE) ||
    lowerTail > CANDLE_TAIL_MAX_TOLARENCE
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

function calculateTargetPrice(entryPrice, profitPercentage, isLongOrder) {
  if (isLongOrder) {
    return entryPrice * (1 + profitPercentage / 100);
  } else {
    return entryPrice * (1 - profitPercentage / 100);
  }
}
