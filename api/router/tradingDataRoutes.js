const express = require("express");
const router = express.Router();
const tradingDataController = require("../controller/tradingDataController");

// Define your routes here
router.post("/", tradingDataController.createTradingData);

module.exports = router;
