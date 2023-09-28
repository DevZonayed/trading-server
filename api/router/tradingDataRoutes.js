const express = require("express");
const router = express.Router();
const tradingDataController = require("../controller/tradingDataController");
const TradingSignalMiddleware = require("../middleware/signals/TradingSignalMiddleware");

// Define your routes here
router.post(
  "/signal-data",
  TradingSignalMiddleware.TradingDataMiddleware,
  tradingDataController.handleTradingSignal
);
router.post("/", tradingDataController.updateTradingData);

module.exports = router;
