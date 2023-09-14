const AsyncHandler = require("express-async-handler");
const { SendMail } = require("../AWS/mail/SendMail");
const aws = require("aws-sdk");
require("dotenv").config();

const SESConfig = {
  // AWS_SDK_LOAD_CONFIG: 1,
  accessKeyId: process.env.AWS_SES_USER_NAME,
  accessSecretKey: process.env.AWS_SES_USER_PASSWORD,
  region: "ap-south-1",
};

aws.config.update(SESConfig);

const ses = new aws.SES();

/**
 * @route "/api/v1/mail/send"
 * @desc "This Controler is for Send Mail
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const sendMail = AsyncHandler(async (req, res, next) => {
  const { emailTo, emailFrom, message, name } = req.body;

  // let mail = new SendMail();
  // let response = await mail.send({ from, to });

  const params = {
    Destination: {
      ToAddresses: [emailTo],
    },
    Message: {
      Body: {
        Text: {
          Data:
            "This is from SoroBindu Management by Amazon by " +
            name +
            "\n" +
            message,
        },
      },
      Subject: {
        Data: `  Name: ${emailFrom}`,
      },
    },
    Source: "zonayed320@gmail.com",
  };

  const response = await ses.sendEmail(params).promise();

  res.status(200).json({
    message: "Mail Send Success",
    data: response,
  });
});

module.exports = { sendMail };
