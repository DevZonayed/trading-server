const nodemailer = require("nodemailer");
require("dotenv").config();
class SendMail {
  constructor() {
    this.transport = nodemailer.createTransport({
      host: process.env.AWS_SES_HOST,
      port: process.env.AWS_SES_PORT,
      secure: true, // use SSL,
      // you can try with TLS, but port is then 587
      auth: {
        user: process.env.AWS_SES_USER_NAME, // Your email id
        pass: process.env.AWS_SES_USER_PASSWORD, // Your password
      },
    });
  }
  // Configure Transport
  send({ from, to }) {
    let transport = this.transport;
    return new Promise((resolve, reject) => {
      transport
        .sendMail({
          from: from,
          to,
          subject: "Test Email from Amazon",
          text: "Hello there this is test email from amazon",
        })
        .then((res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}

module.exports = { SendMail };
