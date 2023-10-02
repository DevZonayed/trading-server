const express = require("express");
const router = express.Router();
const tradingDataController = require("../controller/tradingDataController");
const TradingSignalMiddleware = require("../middleware/signals/TradingSignalMiddleware");
const {
  LastAlgoSignalMiddleware,
} = require("../middleware/LASO/LastAlgoSignalMiddleware");

router.post("/push", tradingDataController.handlePushToTeligrame);
// Define your routes here
router.post(
  "/signal-data",
  TradingSignalMiddleware.TradingDataMiddleware,
  tradingDataController.handleTradingSignal
);
router.post(
  "/",
  LastAlgoSignalMiddleware,
  tradingDataController.updateTradingData
);

module.exports = router;
