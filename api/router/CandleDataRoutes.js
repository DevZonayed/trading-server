const express = require("express");
const router = express.Router();
const CandleDataController = require("../Stratagys/OneHourTortories/candleDataController");

// Candle Data Route
router.post("/", CandleDataController.initialCandleCalculation , CandleDataController.handleOrderCreation);

module.exports = router;
