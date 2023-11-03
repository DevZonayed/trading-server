const CandleData = require("../../../model/CandleData");
const AsyncHandler = require("express-async-handler");
const { checkArrayContainsAllItems, generateDateRageFilterMongoose, generateMultiCandleTimeRange } = require("../utils");
const { parseStringToObject } = require("../../../helper/stringToObject");
const Trade = require("../../../model/Trade");


const REQUIRED_DATA_KEYS = ["symbol", "time", "timeframe"];
const TYPES_FOR_ORDER_TAKE = ["default", "llb", "laso"];

const SETTINGS = {
    strategyName: "Tortoris_1h",
    order : {
        orderName : "oneMinStrWithSmartTrailAndTrendCatcher",
        exchange : "Binance"
    },
    telegramCradentials: {
        botToken: "6465687056:AAFAoET1Ln3zRRutTy6nvlfT2FAeVvJscMI",
        channelId: "-1002086222625"
    },
    entryPricePercent: 0.02,
    profitTakePercentage: [0.10, 0.30, 1]
}

/**
 * Route : "/api/v1/trade/oneMinSrtSmartTrail"
 */
const handleOneMinSrtWithSmartTrailandTrendCatcher = AsyncHandler(async (req, res, next) => {
    let orderData = parseStringToObject(req.body);
    let { symbol, time, timeframe, long, short } = orderData
    time = new Date(time);
    long = long ? true : false;
    short = short ? true : false;

    let watchingTimerSeconds = 70 // Seconds

    // Find the candle Data
    let candleData = await CandleData.findOne({ symbol, time, timeframe, name: SETTINGS.strategyName })

    // Watch for candles
    const pipeline = [
        {
            $match: {
                $and: [
                    { 'fullDocument.symbol': symbol },
                    { 'fullDocument.time': time },
                    { 'fullDocument.timeframe': timeframe }
                ],
                $or: [
                    { operationType: 'insert' },
                    { operationType: 'update' },
                    { operationType: 'replace' }
                ]
            }
        }
    ];
    const options = { fullDocument: 'updateLookup' };
    let orderCandleChangewStream = CandleData.watch(pipeline, options)

    const orderWatchTimer = setTimeout(() => {
        orderCandleChangewStream.close();
        console.log('Order Change stream closed due to timeout.');
        return res.status(408).send('Stopped watching for updates after timeout.');
    }, watchingTimerSeconds * 1000)


    // Watching for change
    orderCandleChangewStream.on("change", (change) => {
        let candleData = change.fullDocument;
        if (candleData && checkArrayContainsAllItems({ data: TYPES_FOR_ORDER_TAKE, array: candleData.type })) {
            clearTimeout(orderWatchTimer);
            orderCandleChangewStream.close()
            req.candleData = candleData;
            req.long = long;
            req.short = short;
            return next()
        } else {
            console.log("Change happend!")
        }
    })

    // Listen to the error of watching document schema
    orderCandleChangewStream.on("error", () => {
        console.error('Error with Candle data change stream:', err);
        clearTimeout(orderWatchTimer);
        orderCandleChangewStream.close();
        res.status(500).send('An error occurred while watching the document.');
    })

    // Check if the finded Candle Data is enough
    if (candleData && checkArrayContainsAllItems({ data: TYPES_FOR_ORDER_TAKE, array: candleData.type })) {
        clearTimeout(orderWatchTimer);
        orderCandleChangewStream.close()
        req.candleData = candleData;
        req.long = long;
        req.short = short;
        return next();
    } else if (candleData) {
        console.log("Document Found")
        console.log(candleData)
    } else {
        console.log("Document Not Found")
    }

})



/**
 * This Middleware will work for dicition making
 * @param req 
 * @param res 
 * @param next 
 */
const handleDicisionMaking = AsyncHandler(async (req, res, next) => {
    let currentCandle = req.candleData;
    let long = req.long;
    let short = req.short;
    let { name, symbol, timeframe, time } = currentCandle;
    
    // Query Previous Candles
    let dateQueryForPrev = generateDateRageFilterMongoose(
        generateMultiCandleTimeRange(time, +timeframe, 4)
    );
    let prevCandles = await CandleData.find({
        name,
        symbol,
        timeframe,
        time: dateQueryForPrev,
    }).sort({time : -1});


    let newOrder = new Trade({
        coin : symbol,

    })






    res.json({
        message: "Success"
    })
})




module.exports = {
    handleOneMinSrtWithSmartTrailandTrendCatcher,
    handleDicisionMaking
}