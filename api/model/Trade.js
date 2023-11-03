const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["running", "pending", "closed"],
      required : true
    },
    coin: {
      type: String,
      required: true,
    },
    exchange: String,
    leverage: Number,
    leverageType : {
        type : String,
        enum: ["cross", "isolated"],
    },
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
    isProfitable : Boolean,
    profitMargin : Number,
    strategyData: Object,
    reason: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Trade", tradeSchema);