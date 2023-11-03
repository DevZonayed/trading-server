const mongoose = require("mongoose");

const candleDataSchema = new mongoose.Schema(
  {
    name : {
      type : String,
      require: true,
      index: true,
      sparse: true,
    },
    symbol: {
      type: String,
      require: true,
      index: true,
      sparse: true,
    },
    time: {
      type: Date,
      require: true,
      index: true,
      sparse: true,
    },
    timeframe: {
      type: Number,
      require: true,
      index: true,
      sparse: true,
    },
    ema : Number,
    change : Number,
    type : [String],
    open: {
      type: Number,
    },
    close: {
      type: Number,
    },
    high: {
      type: Number,
    },
    low: {
      type: Number,
    },
    volume: {
      type: Number,
    },
    candleStatus: {
      type: Number,
      enum: [1, 0 , -1],
    },
    change: {
      type: Number,
    },
    bodySize: {
      type: Number,
    },
    upperTail: {
      type: Number,
    },
    lowerTail: {
      type: Number,
    },
    longEntryPrice: {
      type: Number,
    },
    shortEntryPrice: {
      type: Number,
    },
    longProfitTakeZones: [Number],
    shortProfitTakeZones: [Number],
    stopLose: {
      type: Number,
    },
    fundingRate: {
      type: Number,
    },
    interestRate: {
      type: Number,
    },
    longRatio: {
      type: Number,
    },
    shortRatio: {
      type: Number,
    },
    data: Object,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CandleData", candleDataSchema);
