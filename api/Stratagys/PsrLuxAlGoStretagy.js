const AsyncHandler = require("express-async-handler");
const {
  TelegramPandaBite5MinInstance,
  TelegramInstance,
} = require("../service/Telegram");
const TradeOrder = require("../model/TradeOrder");
const TradingData = require("../model/TradingData");

const STRAATEGY_NAME = "PsrLuxAlGoStretagy";
const EXCHANGE = "Binance Futures, ByBIt USDT";
const LEVERAGE = "Isolated 1x";
const WAITING_CANDLE_COUNT = 5;
const REQUERED_DATA = ["LASO", "PSR"];

const PsrLuxAlGoStretagy = AsyncHandler(async (req, res) => {
  let Message = TelegramPandaBite5MinInstance;
  let Notify = TelegramInstance;
  let candle = req?.candle;
  let { type, name, time, timeframe, _id } = candle;

  // Condition for order exutable or not ?
  let isOrderExecutable =
    candle.data[REQUERED_DATA[0]] && candle.data[REQUERED_DATA[1]];

  // type validation
  if (!REQUERED_DATA.includes(type)) {
    return res.status(400).json({
      message: "Type is not suitable to this Strategy",
    });
  }

  // Get Latest Pending Order
  let lastOrder = await TradeOrder.findOne({
    name: STRAATEGY_NAME,
    status: {
      $ne: "closed",
    },
  }).sort({
    createdAt: -1,
  });

  // Notify To Telegrame
  if (type == REQUERED_DATA[0]) {
    let { data, ...restInfo } = candle;
    TelegramInstance.basicCandleNotification(restInfo);
  }
  // Hndle LuxAlgo Signal
  if (type == REQUERED_DATA[0] && !isOrderExecutable) {
    // Trand Catcher Shifting
    if (candle.data[REQUERED_DATA[0]]?.trandCatcherShift) {
      lastOrder.StrategyData = lastOrder.StrategyData
        ? { ...lastOrder.StrategyData, trandCatcherShift: true }
        : { trandCatcherShift: true };
    }
    // smart Trail Shift
    if (candle.data[REQUERED_DATA[0]]?.smartTrailShift) {
      lastOrder.StrategyData = lastOrder.StrategyData
        ? { ...lastOrder.StrategyData, smartTrailShift: true }
        : { smartTrailShift: true };
    }

    // Pending Order Validation
    if (lastOrder?.status == "pending") {
      await lastOrderValidate(lastOrder, candle);
    } else if (lastOrder?.status == "running") {
      if (
        (lastOrder.direction == "Short" &&
          candle.data[REQUERED_DATA[0]]?.trandCatcherShift == "Long") ||
        (lastOrder.direction == "Long" &&
          candle.data[REQUERED_DATA[0]]?.trandCatcherShift == "Short")
      ) {
        lastOrder.status = "closed";
      }
      await lastOrder.save();
    }
    return res.status(201).json({
      message: "Success",
    });
  }

  if (!isOrderExecutable) {
    Notify.sendMessage(
      `One of the required Data Not Found!\n LASO : ${
        candle.data[REQUERED_DATA[0]] ? "Found" : "Not Found"
      }\nPSR:${candle.data[REQUERED_DATA[1]] ? "Found" : "Not Found"}`
    );
    return res.json({
      message: "Success",
    });
  }

  // Signal Identify
  let signal = null;
  if (
    candle?.data[REQUERED_DATA[1]]?.Long == 1 ||
    candle?.data[REQUERED_DATA[1]]?.Long == "1"
  ) {
    signal = "Long";
  } else if (
    candle?.data[REQUERED_DATA[1]]?.Short == 1 ||
    candle?.data[REQUERED_DATA[1]]?.Short == "1"
  ) {
    signal = "Short";
  }

  // Check IS Trand Catcher Is Shift In the duration of the order
  if (lastOrder && !lastOrder?.StrategyData?.trandCatcherShift) {
    Message.falseOrder({
      direction: signal,
      reason: "There is no trand catcher shifting in the order duration!",
    });

    return res.json({
      message: "success",
    });
  }

  // Watch for previous pending order
  if (lastOrder?.status == "pending" || lastOrder?.status == "running") {
    lastOrder.status = "closed";
    lastOrder.reason =
      lastOrder?.status + " Order is Closed Due to a new Signal";
    await lastOrder.save();
  }

  // Select Entry Price
  let entryPrice = 0;
  let profitTakeZones = [];
  if (signal == "Short") {
    entryPrice = candle.shortEntryPrice;
    profitTakeZones = candle.shortProfitTakeZones;
  } else if (signal == "Long") {
    entryPrice = candle.longEntryPrice;
    profitTakeZones = candle.longProfitTakeZones;
  }

  let OrderObject = {
    coin: name,
    direction: signal,
    name: STRAATEGY_NAME,
    // status: "closed",
    exchange: EXCHANGE,
    leverage: LEVERAGE,
    entryPrice,
    profitTakeZones,
    reason: "",
  };

  let isValidCandle = isCandleAppropriate(candle);
  if (!isValidCandle.status) {
    OrderObject = {
      ...OrderObject,
      status: "closed",
      reason: isValidCandle.reason,
    };
    let order = new TradeOrder(OrderObject);
    await order.save();
    return res.json({
      message: "success",
    });
  }

  // Last Candle Data
  let lastCandle = await TradingData.findById(_id);
  if (!lastCandle) {
    OrderObject = {
      ...OrderObject,
      status: "closed",
      reason: "Last Candle not found that include LASO",
    };
    let order = new TradeOrder(OrderObject);
    await order.save();
    return res.json({
      message: "Last Candle not found that include LASO",
    });
  }

  // Other Conditions
  let filterResult = await lasoFilters(lastCandle, signal);
  if (filterResult.order == "Hold") {
    OrderObject = {
      ...OrderObject,
      status: "pending",
      reason: filterResult.reason,
    };
    let order = new TradeOrder(OrderObject);
    await order.save();
    return res.json({
      message: "success",
    });
  } else if (filterResult.order == "Run") {
    OrderObject = {
      ...OrderObject,
      status: "running",
      reason: filterResult.reason,
    };
    let order = new TradeOrder(OrderObject);
    await order.save();
    return res.json({
      message: "success",
    });
  } else if (filterResult.order == "Close") {
    OrderObject = {
      ...OrderObject,
      status: "closed",
      reason: filterResult.reason,
    };
    let order = new TradeOrder(OrderObject);
    await order.save();
    return res.json({
      message: "success",
    });
  } else {
    Notify.sendMessage(
      `Order Generated But somehow Not execute\n Filter Return ${JSON.stringify(
        filterResult
      )}\n Candle Data : ${candle}`
    );
  }

  return res.json({
    message: "Success",
  });
});

module.exports = PsrLuxAlGoStretagy;

/**
 * Manage Pending Order
 * @param {*} orderData
 */
async function lastOrderValidate(orderData, candleData) {
  try {
    let luxAlgoData = candleData.data[REQUERED_DATA[0]];
    let orderDirection = orderData.direction;
    if (orderData.waitingCandleCount > WAITING_CANDLE_COUNT) {
      return await TradeOrder.findOneAndUpdate(
        {
          _id: orderData._id,
        },
        {
          status: "closed",
          reason: "Waiting Period is over",
        },
        {
          new: true,
        }
      );
    }

    if (
      (luxAlgoData?.smartTrailShift == "Short" && orderDirection == "Short") ||
      (luxAlgoData?.smartTrailShift == "Long" && orderDirection == "Long")
    ) {
      return await TradeOrder.findOneAndUpdate(
        {
          _id: orderData._id,
        },
        {
          status: "running",
        },
        {
          new: true,
        }
      );
    } else {
      return await TradeOrder.findOneAndUpdate(
        {
          _id: orderData._id,
        },
        {
          $inc: { waitingCandleCount: 1 },
        },
        {
          new: true,
        }
      );
    }
  } catch (err) {
    console.error(err);
  }
}

/**
 * Check if the candle is valid for take order or not
 * @param {Candle Data} candleData
 * @returns
 */
function isCandleAppropriate(candleData) {
  const { bodySize, upperTail, lowerTail } = candleData;
  console.log({ bodySize, upperTail, lowerTail });
  let status = true;
  let reason = "";

  if (
    bodySize > 0.1 &&
    (upperTail >= 2 * bodySize || lowerTail >= 2 * bodySize)
  ) {
    status = false;
    reason =
      "Body Size is greater than 0.10 and one of the tails is double the body size.";
  } else if (bodySize >= 0.5 && (upperTail >= 0.5 || lowerTail >= 0.5)) {
    status = false;
    reason =
      "Body Size is greater than 0.50 and one of the tails is also greater than 0.5";
  }

  return {
    status,
    reason,
  };
}

async function lasoFilters(lastCandle, signal) {
  try {
    let luxAlgoData = lastCandle.data[REQUERED_DATA[0]];

    if (
      (luxAlgoData?.polished_smart_trail == 1 && signal == "Short") ||
      (luxAlgoData?.polished_smart_trail == 0 && signal == "Long")
    ) {
      return {
        order: "Hold",
        reason:
          "Smart Trail Positon is not good\n" +
          "Smart Trail is" +
          luxAlgoData?.polished_smart_trail,
      };
    } else if (
      (luxAlgoData?.polished_smart_trail == 0 && signal == "Short") ||
      (luxAlgoData?.polished_smart_trail == 1 && signal == "Long")
    ) {
      return {
        order: "Run",
        reason: "",
      };
    } else {
      return {
        order: "Close",
        reason: `Unclear Signal\n Smart Trail is : ${
          luxAlgoData?.polished_smart_trail
        }\n signal is : ${signal}\nOverall Algo Data ${JSON.stringify(
          lastCandle
        )}`,
      };
    }
  } catch (err) {
    console.warn(err);
  }
}
