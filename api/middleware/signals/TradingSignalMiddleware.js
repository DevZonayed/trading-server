const { csvStringToObject } = require("../../helper/phoneNumberFormater");
const TradingData = require("../../model/TradingData");
const { TelegramInstance } = require("../../service/Telegram");
const {
  getDiffrenceOfUpperAndLowerForBB,
} = require("../../utils/BB/BolingerBands");

const REQUIRMENTFORSIGNALS = {
  thrashold: 50,
};
/**
 * /api/v1/trading-data/signal-data
 * @param {*} req
 * @param {*} res
 */
let tryCount = 0;
exports.TradingDataMiddleware = async (req, res, next) => {
  try {
    let { type, name, time, timeframe, ...restData } = csvStringToObject(
      req.body
    )[0];

    if (type !== "LASO") {
      return res.json({
        message: "Type Not Supported",
      });
    }

    let candleData = await TradingData.find({
      timeframe,
      time,
      name,
    })[0];

    if (!candleData || !candleData?.data?.BB) {
      TelegramInstance.sendMessage(
        `Signal found but Bolinger band's data not found`
      );
      if (tryCount <= 3) {
        return setTimeout(() => {
          tryCount += 1;
          TradingDataMiddleware(req, res, next);
        }, 5000);
      }
      return res.json({
        message: "Bolinger Band data not found",
      });
    }

    let { upper, lower } = candleData?.data?.BB;
    let thrashold = getDiffrenceOfUpperAndLowerForBB(upper, lower);

    // Check the thrashold
    if (!(thrashold >= REQUIRMENTFORSIGNALS.thrashold)) {
      TelegramInstance.sendMessage(
        `${restData.signal_type} signal occard but thrashold is so low`
      );
      // send response to database
      return res.json({
        message: "Thrashold is low",
      });
    }

    // Storing basic data to request
    req.signal_type = restData.signal_type;
    next();
  } catch (err) {
    console.log(err);
  }
};
