const TradingData = require("../model/TradingData");
const { csvStringToObject } = require("../helper/phoneNumberFormater");
const {
  TelegramInstance,
  TelegramPandaBite5MinInstance,
} = require("../service/Telegram");
const {
  getDiffrenceOfUpperAndLowerForBB,
} = require("../utils/BB/BolingerBands");

// exports.createTradingData = async (req, res) => {
//   try {
//     if (!Object.values(req.body).includes("")) {
//       const newData = new TradingData({
//         data: JSON.stringify(req.body),
//       });
//       await newData.save();
//     }
//     console.log("//================================//");
//     console.log(req.body);
//     res.status(201).json({
//       message: "Success",
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

/**
 * @route /api/v1/trading-data
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.updateTradingData = async (req, res) => {
  try {
    let bodyData = csvStringToObject(req.body);
    console.log(bodyData[0]);
    let { name, time, timeframe, type, ...restData } = bodyData[0];

    // Check if the type key exists in the data payload
    if (!type) {
      return res
        .status(400)
        .json({ error: "Type key is missing in the data payload." });
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

    // console.log(updatedDocument);
    if (type == "BB") {
      TelegramInstance.sendMessage("Bolinger Band's Data Pushed to server!");
    }

    res.status(200).json(updatedDocument);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the trading data." });
  }
};

/**
 * /api/v1/trading-data/signal-data
 * @param {*} req
 * @param {*} res
 */
exports.handleTradingSignal = async (req, res) => {
  try {
    let signalType = req?.signal_type;

    TelegramInstance.sendMessage(`Perfect time to ${signalType}`);
    res.json({
      message: "Success",
    });
  } catch (err) {
    console.log(err);
  }
};

exports.handlePushToTeligrame = async (req, res) => {
  try {
    let formatedChunk = csvStringToObject(req.body)[0];
    let { to, message } = formatedChunk;

    if (to == "notify") {
      TelegramInstance.sendMessage(message);
    } else if (to == "tread") {
      TelegramPandaBite5MinInstance.sendMessage(message);
    } else {
      TelegramInstance.sendMessage(
        `Unknown Format of notifaction pushed\n"${req.body}"\n== Format Should be : \nto,message\nnotify/tread,test message`
      );
    }

    res.json({
      message: "Success",
    });
  } catch (err) {
    console.warn(err);
  }
};
