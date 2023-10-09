const mongoose = require("mongoose");

const tradingDataSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    time: {
      type: Date,
      require: true,
    },
    timeframe: {
      type: String,
      require: true,
    },
    open: {
      type: Number,
      require: true,
    },
    close: {
      type: Number,
      require: true,
    },
    high: {
      type: Number,
      require: true,
    },
    low: {
      type: Number,
      require: true,
    },
    bodySize: {
      type: Number,
      require: true,
    },
    longProfitTakeZones: [Number],
    shortProfitTakeZones: [Number],
    upperTail: {
      type: Number,
      require: true,
    },
    lowerTail: {
      type: Number,
      require: true,
    },
    upperTailMiddlePrice: {
      type: Number,
      require: true,
    },
    lowerTailMiddlePrice: {
      type: Number,
      require: true,
    },
    data: Object,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TradingData", tradingDataSchema);
