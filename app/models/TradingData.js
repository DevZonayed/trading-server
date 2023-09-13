const mongoose = require("mongoose");

const tradingDataSchema = new mongoose.Schema(
  {
    data: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("TradingData", tradingDataSchema);
