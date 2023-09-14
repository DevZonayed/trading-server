const AsyncHandler = require("express-async-handler");
const MessageReport = require("../model/MessageReport");
const { TextMessage } = require("../SSLWIRELESS/Message");

/**
 * @route "/api/v1/message/send"
 * @desc "This Controler is for Send Message
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const sendMessage = AsyncHandler(async (req, res, next) => {
  const { msgData } = req.body;
  const { type, ...msgInfo } = msgData;

  if (type === "single") {
    let message = new TextMessage(msgInfo);
    let response = await message.singleMessage();
    generateMessageReport(response);
    res.status(200);
    res.json({
      message: `Message Send Successfull to ${
        response.filter((item) => item.sms_status == "SUCCESS").length
      } Person`,
      data: response,
    });
    return false;
  } else if (type === "multiple") {
    let message = new TextMessage(msgInfo);
    let response = await message.bulkMessage();
    generateMessageReport(response);
    res.status(200);
    res.json({
      message: `Message send successfull to ${
        response.filter((item) => item.sms_status == "SUCCESS").length
      } person`,
      data: response,
    });
    return false;
  } else if (type === "dynamic") {
    let message = new TextMessage(msgInfo);
    let response = await message.dynamicMessage();
    generateMessageReport(response);
    res.status(200);
    res.json({
      message: `Message send successfull to ${
        response.filter((item) => item.sms_status == "SUCCESS").length
      } person`,
      data: response,
    });
    return false;
  }

  res.status(200).json({
    message: "Message Send Success",
    data: "Done",
  });
});

const getMessageReport = AsyncHandler(async (req, res, next) => {
  const { type } = req.body;

  const reportCount = await MessageReport.find({ type }).count();
  const reports = await MessageReport.find({ type })
    .sort({
      updatedAt: -1,
    })
    .limit(20);

  res.status(200).json({
    message: "Reports Get Success",
    count: reportCount,
    reports,
  });
});

module.exports = { sendMessage, getMessageReport };
const generateMessageReport = async (response) => {
  let successCount = response.filter(
    (item) => item.sms_status == "SUCCESS"
  ).length;
  let unSuccessCount = response.filter(
    (item) => item.sms_status != "SUCCESS"
  ).length;

  await MessageReport.create({
    type: "sms",
    success: successCount || 0,
    unsuccess: unSuccessCount || 0,
    report: response,
  });
};
