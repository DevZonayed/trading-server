const mongoose = require("mongoose");

const tradingDataSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
    time: {
      type: String,
      require: true,
    },
    timeframe: {
      type: String,
      require: true,
    },
    data: Object,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TradingData", tradingDataSchema);
