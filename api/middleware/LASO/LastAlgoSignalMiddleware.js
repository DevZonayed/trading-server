const { csvStringToObject } = require("../../helper/phoneNumberFormater");
const TradingData = require("../../model/TradingData");
const {
  TelegramInstance,
  TelegramPandaBite5MinInstance,
} = require("../../service/Telegram");
const AsyncHandler = require("express-async-handler");
const { generateNotify } = require("./Notifications/genNotifyTel");
const organizeLaData = require("./helper/OrganizeLaData");
const { signalStrengthStrategy } = require("./Strategy/SignalStrength");

const LastAlgoSignalMiddleware = AsyncHandler(async (req, res, next) => {
  let bodyData = csvStringToObject(req.body)[0];
  let { name, time, timeframe, type, ...restData } = bodyData;
  if (!(type == "LASO" || type == "LASO" || !type)) {
    return next();
  }

  // Construct the update query
  const updateQuery = {
    $set: {},
  };

  // Set the nested object in the data field based on the type key
  updateQuery.$set[`data.${type}`] = restData;
  const updatedDocument = await TradingData.findOneAndUpdate(
    { name, time, timeframe },
    updateQuery,
    {
      new: true,
      upsert: true,
    }
  );

  let message = generateNotify(updatedDocument?.data[type]);
  message =
    `<b><i>${timeframe} Candles ${type} data report:</i></b>\n ==========================\n` +
    message;
  // Send repost to telegram
  // TelegramInstance.sendMessagehtml(message);
  let candleData = await organizeLaData(updatedDocument, type);
  TelegramInstance.sendMessagehtml(`
  <pre>
  ${timeframe} min Data Update
  signal: ${candleData.signal},
  isClose: ${candleData.isClose},
  polished_trend_catcher: ${candleData.polished_trend_catcher},
  take_profit: ${candleData.take_profit},
  stop_loss: ${candleData.stop_loss},
  trand_strength: ${candleData.trand_strength},
  barColor: ${candleData.barColor},
  smart_trail: ${candleData.smart_trail},
  trend_tracer: ${candleData.trend_tracer},
  upperTail: ${candleData.upperTail}%,
  lowerTail: ${candleData.lowerTail}%
  </pre>
  `);

  // Apply stratagy 1
  let strengthStratgy = signalStrengthStrategy(candleData, updatedDocument);
  if (strengthStratgy.status) {
    TelegramPandaBite5MinInstance.sendMessage(
      `
      COIN*: ${strengthStratgy.data.coin}
      Direction*: ${strengthStratgy.data.direction}
      Exchange*: ${strengthStratgy.data.exchange}
      ENTRY*: ${strengthStratgy.data.entry}
      `
    );
  }
  res.status(200).json(updatedDocument);
});

module.exports = { LastAlgoSignalMiddleware };
