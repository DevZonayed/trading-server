const { default: axios } = require("axios");

const BOT_TOKEN = "6539989999:AAFmKbzWk1qDyLP4Lyp7C4pJelcJxyRcY2A";
const GROUP_ID = -4028893886;

class Telegram {
  constructor(botToken, groupId) {
    this.botToken = botToken;
    this.groupId = groupId;
  }

  sendMessage(text) {
    axios
      .post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.groupId,
        text: text,
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }
  sendMessagehtml(text) {
    axios
      .post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.groupId,
        text: text,
        parse_mode: "HTML",
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }
}

const TelegramInstance = new Telegram(BOT_TOKEN, GROUP_ID);

module.exports = { TelegramInstance };
