const express = require("express");
const router = express.Router();
const CandleDataController = require("../Stratagys/OneHourTortories/candleDataController");
const { handleOneMinSrtWithSmartTrailandTrendCatcher, handleDicisionMaking } = require("../Stratagys/OneHourTortories/orderTake/OneMinStrWithSmartTrailAndTrendCatcher");

// Candle Data Route
router.post("/trade", handleOneMinSrtWithSmartTrailandTrendCatcher , handleDicisionMaking);
router.post("/", CandleDataController.initialCandleCalculation , CandleDataController.handleOrderCreation);



module.exports = router;
