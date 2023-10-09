const express = require("express");
const router = express.Router();
const tradingDataController = require("../controller/tradingDataController");
const TradingSignalMiddleware = require("../middleware/signals/TradingSignalMiddleware");
const { OrgCandleData } = require("../middleware/candle/OrgCandleData");
const {
  LastAlgoSignalMiddleware,
} = require("../middleware/LASO/LastAlgoSignalMiddleware");
const PsrLuxAlGoStretagy = require("../Stratagys/PsrLuxAlGoStretagy");

// Define your routes here
router.post(
  "/signal-data",
  TradingSignalMiddleware.TradingDataMiddleware,
  tradingDataController.handleTradingSignal
);
router.post("/push", tradingDataController.handlePushToTeligrame);
router.post(
  "/",
  OrgCandleData,
  LastAlgoSignalMiddleware,
  PsrLuxAlGoStretagy
  // tradingDataController.updateTradingData
);

module.exports = router;
