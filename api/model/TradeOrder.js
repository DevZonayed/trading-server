const mongoose = require("mongoose");
const { TelegramPandaBite5MinInstance } = require("../service/Telegram");

const tradeOrderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["running", "pending", "closed"],
    },
    coin: {
      type: String,
      required: true,
    },
    exchange: String,
    leverage: String,
    direction: {
      type: String,
      enum: ["Long", "Short"],
      requered: true,
    },
    entryPrice: {
      type: Number,
    },
    endPrice: {
      type: Number,
    },
    profitTakeZones: {
      type: Array,
    },
    waitingCandleCount: {
      type: Number,
      default: 0,
    },
    StrategyData: Object,
    reason: String,
  },
  {
    timestamps: true,
  }
);

tradeOrderSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status == "running") {
      orderRunning(this);
    } else if (this.status == "pending") {
      orderPending(this);
    } else if (this.status == "closed") {
      falseOrder(this);
    }
  } else if (this.isModified("reason")) {
    if (this.status == "closed") {
      if (this.reason == "") {
        closeOrder(this);
      } else {
        falseOrder(this);
      }
    }
  }
  next();
});

tradeOrderSchema.post("updateOne", function (doc, next) {
  if (this.isModified("status")) {
    if (doc.status == "running") {
      orderRunning(doc);
    } else if (doc.status == "pending") {
      orderPending(doc);
    } else if (doc.status == "closed") {
      closeOrder(doc);
    }
  } else if (this.isModified("reason")) {
    if (doc.status == "closed") {
      falseOrder(doc);
    }
  }
  next();
});

module.exports = mongoose.model("TradeOrder", tradeOrderSchema);

function orderRunning(document) {
  TelegramPandaBite5MinInstance.createOrder({
    coin: document.coin,
    direction: document.direction,
    entry: document.entryPrice,
    exchange: document.exchange,
    leverage: document.leverage,
    targets: document.profitTakeZones,
  });
}

function orderPending(document) {
  TelegramPandaBite5MinInstance.falseOrder({
    direction: document.direction,
    reason: "Order Is On Hold Because " + document.reason,
  });
}

function falseOrder(document) {
  TelegramPandaBite5MinInstance.falseOrder({
    direction: document.direction,
    reason: document.reason,
  });
}

function closeOrder(document) {
  TelegramPandaBite5MinInstance.closeOrder({
    coin: document.coin,
  });
}
