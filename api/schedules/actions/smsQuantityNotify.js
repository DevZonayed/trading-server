const SslWaireless = require("./sslwireless");
const SlackMessage = require("./slackNotify");
async function sendSmsInfo() {
  try {
    let checkBalance = new SslWaireless();
    const response = await checkBalance.checkBalance();
    if (response.data.status_code) {
      if (response.data.balance <= 500) {
        let notification = new SlackMessage({
          text: `Hello, currently we have ${response.data.balance} sms balance in SSLWIRELESS`,
        });
        notification.toRidam().toJillur();
      }
    }
  } catch (err) {
    let notification = new SlackMessage({
      text: `Hello, I think I am in trouble. Please contact with my Developer with this error : ${err}`,
    });
    notification.toRidam().toJillur();
  }
}

module.exports = sendSmsInfo;
