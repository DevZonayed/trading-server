const { default: axios } = require("axios");

const BOT_TOKEN = "6539989999:AAFmKbzWk1qDyLP4Lyp7C4pJelcJxyRcY2A";
const GROUP_ID = -4028893886;

const PandaBite5MinScalping = -1001733606897;
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
        // console.log(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }

  basicCandleNotification(data) {
    const {
      name,
      time,
      timeframe,
      open,
      close,
      high,
      low,
      bodySize,
      upperTail,
      lowerTail,
      type,
    } = data;

    let message = `<b>${type} Data Pushed</b>
<b>Name:</b> ${name}
<b>Time:</b> ${time}
<b>TimeFrame:</b> ${timeframe}
<b>Open:</b> ${open}
<b>Close:</b> ${close}
<b>High:</b> ${high}
<b>Low:</b> ${low}
<b>BodySize:</b> ${bodySize}
<b>UpperTail:</b> ${upperTail}
<b>LowerTail:</b> ${lowerTail}
`;

    this.sendMessagehtml(message);
  }

  falseOrder({ direction, reason }) {
    this.sendMessagehtml(
      `<b>A ${direction} Order is generated but not execute</b>\n<b><i>Reason:</i></b> ${reason}`
    );
  }

  createOrder({ direction, exchange, leverage, entry, targets, coin }) {
    let target = "";
    targets.map((item, index) => {
      if (targets.length == index + 1) {
        target += ` ${item}`;
      } else {
        target += ` ${item},`;
      }
    });

    let message = `COIN: ${coin}\nDirection: ${direction}\nExchange: ${exchange}\nLeverage: ${leverage}\nENTRY: ${entry}\nTARGET: ${target}`;

    this.sendMessage(message);
  }

  closeOrder({ coin }) {
    let message = `CLOSE ${coin}`;
    this.sendMessage(message);
  }
}

const TelegramInstance = new Telegram(BOT_TOKEN, GROUP_ID);
const TelegramPandaBite5MinInstance = new Telegram(
  BOT_TOKEN,
  PandaBite5MinScalping
);

module.exports = { TelegramInstance, TelegramPandaBite5MinInstance };
