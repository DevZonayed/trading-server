const { csvStringToObject } = require("../../helper/phoneNumberFormater");
const TradingData = require("../../model/TradingData");
const { TelegramInstance } = require("../../service/Telegram");
const {
  getDiffrenceOfUpperAndLowerForBB,
} = require("../../utils/BB/BolingerBands");

const REQUIRMENTFORSIGNALS = {
  thrashold: 0.3,
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

    let candleData = await TradingData.findOne({
      timeframe,
      time,
      name,
    });

    if (!candleData || !candleData?.data?.BB) {
      candleData = await TradingData.findOne({
        timeframe,
        name,
      })
        .sort({ createdAt: -1 })
        .skip(1)
        .limit(1);

      if (!candleData || !candleData?.data?.BB) {
        TelegramInstance.sendMessage(
          `Signal found but Bolinger band's data not found`
        );
        return res.json({
          message: "Bolinger Band data not found",
        });
      }
    }

    let { upper, lower } = candleData?.data?.BB;
    let thrashold = getDiffrenceOfUpperAndLowerForBB(upper, lower);

    // Check the thrashold
    if (!(thrashold >= REQUIRMENTFORSIGNALS.thrashold)) {
      TelegramInstance.sendMessage(
        `${restData.signal_type} signal occard but thrashold is so low
          needed thrashold is above ${REQUIRMENTFORSIGNALS.thrashold}%
          But the signal thrashold is ${thrashold}%
        `
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
