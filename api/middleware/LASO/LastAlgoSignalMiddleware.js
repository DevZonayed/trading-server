const AsyncHandler = require("express-async-handler");
const organizeLaData = require("./helper/OrganizeLaData");
const { signalStrengthStrategy } = require("./Strategy/SignalStrength");

const LastAlgoSignalMiddleware = AsyncHandler(async (req, res, next) => {
  let orgCandleData = req?.candle;
  let { type } = orgCandleData;

  if (!(type == "LASO" || !type)) {
    return next();
  }

  let candleData = await organizeLaData(orgCandleData);

  req.candle = candleData;
  return next();
});

module.exports = { LastAlgoSignalMiddleware };
