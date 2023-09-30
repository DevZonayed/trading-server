const { csvStringToObject } = require("../../helper/phoneNumberFormater");
const TradingData = require("../../model/TradingData");
const { TelegramInstance } = require("../../service/Telegram");
const AsyncHandler = require("express-async-handler");
const { generateNotify } = require("./Notifications/genNotifyTel");

const LastAlgoSignalMiddleware = AsyncHandler(async (req, res, next) => {
  let bodyData = csvStringToObject(req.body)[0];
  let { name, time, timeframe, type, ...restData } = bodyData;
  if (!(type == "LASO1" || type == "LASO5" || !type)) {
    console.log("Called Next");
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
  TelegramInstance.sendMessagehtml(message);
  res.status(200).json(updatedDocument);
});

module.exports = { LastAlgoSignalMiddleware };
