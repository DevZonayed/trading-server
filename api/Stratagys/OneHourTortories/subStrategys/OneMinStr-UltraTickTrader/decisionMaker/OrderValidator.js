const Trade = require("../../../../../model/Trade");
const { Telegram } = require("../../../../../service/Telegram");
const { calculateTwoRangePercentage } = require("../../../utils");
const SETTINGS = require("../Settings");



const telegram = new Telegram(
    SETTINGS.telegramCradentials.botToken,
    SETTINGS.telegramCradentials.channelId
);


/**
 * This function will handle all of the condition that nessesary for order execute
 * @param {CandleData{}} candleData 
 * @param {CandleData[]} prevCandles
 * @returns {{isExecutable , reson , direction}}
 */
async function HandleTradeOrder(candleData, prevCandles) {
    let isPrimaryTrade = isValidTrade(candleData);
    let trandCatcherShift = determineTrandCatcherShift(candleData)

    // Check IF tread actionable or not
    if (!isPrimaryTrade && !trandCatcherShift) {
        return {
            isExecutable: false,
            reson: SETTINGS.MESSAGES.ORDER.cancle.TrandCatcherSmartTrailNotInFavour
        }
    }

    // Check Previous Order
    let prevTrade = await fatchPreviousTrade(candleData);

    if (prevTrade) {
        return handleTradeWithExistingTrade(isPrimaryTrade, trandCatcherShift, prevTrade, candleData, prevCandles)
    }

    let direction = isPrimaryTrade ? isPrimaryTrade : trandCatcherShift;
    await handleTrade({ candleData, direction, prevCandles })


}


/**
 * This function will be responsible for execute trade
 * @param {direction , candleData} param0 
 */
async function handleTrade({ direction, candleData }) {
    let isFalseTrade = isTradeFalsifiable({ direction, candleData, prevCandles });

    if (isFalseTrade) {
        telegram.falseOrder({
            direction,
            reason: isFalseTrade
        })
        return false
    }

    let processedLeverage = handleLeverage(candleData, prevCandles);

    // Send the leverage alert
    telegram.sendMessage(`Trade Leverage Gonna be ${processedLeverage.value} \n Reson : ${processedLeverage.reson}`)

    // Execute the trade
    let entryPrice = direction == "Long" ? candleData.longEntryPrice : candleData.shortEntryPrice;
    let profitTake = direction == "Long" ? candleData.longProfitTakeZones : candleData.shortProfitTakeZones;
    let coin = candleData.symbol;
    let exchange = SETTINGS.order.exchange

    let tradePayload = {
        name: SETTINGS.order.name,
        status: "running",
        coin,
        exchange,
        leverage: processedLeverage.value,
        leverageType: SETTINGS.order.laverageType,
        direction,
        entryPrice,
        profitTakeZones: profitTake,
    }
    await handleTradeExecute(tradePayload)

}

/**
 * This function will be responsible for Execute Trade
 * @param {Order Data} payload 
 */
async function handleTradeExecute(payload) {
    try {
        telegram.createOrder({
            coin: payload.coin,
            direction: payload.direction,
            entry: payload.entryPrice,
            exchange: payload.exchange,
            leverage: `${payload.leverageType} ${payload.leverage}x`,
            targets: payload.profitTakeZones
        })
        // Create Order In Database
        await Trade.create(payload);
    } catch (err) {
        telegram.sendMessage("Something went wrong while create order in DB\n" + JSON.stringify(err))
    }
}


/**
 * This function will handle trade leverage
 * @param {candleData} candleData 
 * @param {prevCandleData[]} prevCandles 
 * @returns 
 */
function handleLeverage(candleData, prevCandles) {
    let baseLeverage = 1;
    let reson = "There is no condition applyed it's default"
    // All Conditions Will Goes Here
    return {
        value: baseLeverage,
        reson
    };
}



/**
 * This mathod will try to protect falst trade
 * @param {Direction , candleData} param0 
 * @returns 
 */
function isTradeFalsifiable({ direction, candleData }) {
    // Strong Bullish Or Bearish Assets
    let strongBull = Math.abs(candleData.data.strongBullish) > 0 ? true : false
    let strongBear = Math.abs(candleData.data.strongBearish) > 0 ? true : false

    // WT_LB Assets
    let bullishWtgl = candleData.data.wtgl >= 0 && candleData.data.wtgl >= 40 ? true : false;
    let bearishWtgl = candleData.data.wtgl < 0 && Math.abs(candleData.data.wtgl) >= 40 ? true : false;

    // Default Assets
    let trendStrength = candleData.data.trendStrength;
    let bodySize = candleData.bodySize;
    let lowerTail = candleData.lowerTail;
    let upperTail = candleData.upperTail;

    let resons = null;

    // 1
    if ((direction == "Long" && strongBear) || (direction == "Short" && strongBull)) {
        resons
            ? resons += SETTINGS.MESSAGES.ORDER.cancle.StrongBullBearOpositeDirection
            : resons = SETTINGS.MESSAGES.ORDER.cancle.StrongBullBearOpositeDirection
    }

    // 2
    if ((bullishWtgl && direction == "Short") || bearishWtgl && direction == "Long") {
        resons
            ? resons += SETTINGS.MESSAGES.ORDER.cancle.WtLbOpositeGreenLine
            : resons = SETTINGS.MESSAGES.ORDER.cancle.WtLbOpositeGreenLine
    }

    // 3
    if (trendStrength < SETTINGS.order.minimumTrendStrength) {
        resons
            ? resons += SETTINGS.MESSAGES.ORDER.cancle.LowTrendStrength
            : resons = SETTINGS.MESSAGES.ORDER.cancle.LowTrendStrength
    }

    // 4
    if (bodySize > SETTINGS.order.maximumTailSize && bodySize < Math.max(lowerTail, upperTail)) {
        resons
            ? resons += SETTINGS.MESSAGES.ORDER.cancle.MaxTailHapped
            : resons = SETTINGS.MESSAGES.ORDER.cancle.MaxTailHapped
    }

    // 5
    if ((bodySize + upperTail + lowerTail) > SETTINGS.order.maximumCandleSize) {
        resons
            ? resons += SETTINGS.MESSAGES.ORDER.cancle.MaximumBodySizeNoticed
            : resons = SETTINGS.MESSAGES.ORDER.cancle.MaximumBodySizeNoticed
    }

    return resons
}



/**
 * This mathod is responsible for take dicision if there is a existing trade
 * @param {Boolean | String} isPrimaryTrade 
 * @param {Boolean | String} trandCatcherShift 
 * @param {TadeObj{}} prevTrade 
 * @param {CurrenctCandle{}} candleData 
 * @param {PreviousCandle[]} prevCandles 
 * @returns 
 */
async function handleTradeWithExistingTrade(isPrimaryTrade, trandCatcherShift, prevTrade, candleData, prevCandles) {
    // If needed then close the order
    let closeResult = await handleCloseTrend({ ...candleData.data, prevTrade, trandCatcherShift });
    if (!closeResult || !isPrimaryTrade) {
        return false;
    }

    // Give the trade for execute
    let treadPayload = {
        direction: isPrimaryTrade,
        candleData,
    }
    handleTrade(treadPayload)

}


/**
 * This function will make dicition for closing order or not
 * @param {*} param0 
 */
async function handleCloseTrend(candleData) {
    try {

        let { prevTrade } = candleData;
        // Check order close resons
        let reson = handleTradeCloseResons(candleData)
        let profitMargin = calculateTwoRangePercentage(prevTrade.entryPrice, candleData.close)
        if (reson) {
            telegram.sendMessage("Previous Tread will close,\n Your Profit would be: " + profitMargin + "% \n Resion\n" + reson);
            telegram.closeOrder({
                coin: prevTrade.coin
            });


            // Update the order
            await Trade.updateOne({ _id: prevTrade._id }, {
                status: "closed",
                endPrice: candleData.close,
                reason: reson,
                isProfitable: profitMargin > 0,
                profitMargin,
            })

            return true
        } else {
            return false
        }
    } catch (err) {
        telegram.sendMessage("Error Occured while updating the order on bd for close \n Error:" + JSON.stringify(err))
    }
}

/**
 * This function will be responsible for closing order
 * @param {Object} candleData Candle data with extra info
 * @returns 
 */
function handleTradeCloseResons(candleData) {
    let { prevTrade, smartTrailShift, trendCatcherShift, trendStrength } = candleData
    let prevTradeDirection = prevTrade.direction;

    let resons = null

    if (smartTrailShift && prevTradeDirection !== smartTrailShift) {
        resons
            ? resons += SETTINGS.MESSAGES.ORDER.cancle.SmartTrailOpositeDirection
            : resons = SETTINGS.MESSAGES.ORDER.cancle.SmartTrailOpositeDirection
    }

    if (trendCatcherShift && prevTradeDirection !== trendCatcherShift) {
        resons
            ? resons += SETTINGS.MESSAGES.ORDER.cancle.TrendCatcherOpositeDirection
            : resons = SETTINGS.MESSAGES.ORDER.cancle.TrendCatcherOpositeDirection
    }

    if (trendStrength <= 1) {
        resons
            ? resons += SETTINGS.MESSAGES.ORDER.cancle.LowTrendStrength
            : resons = SETTINGS.MESSAGES.ORDER.cancle.LowTrendStrength

    }

    // Return the resion
    return resons

}



/**
 * This function will help to determin primari criteria for executing trade
 * @param {Current Candle Document} candleData 
 * @returns 
 */
function isValidTrade(candleData) {
    let direction = candleData.data.smartTrailShift
    let status = direction !== null ? true : false;
    return {
        status,
        direction
    }
}

/**
 * This function will help to find running Trade
 * @param {Candle Data} candleData 
 * @returns {Boolean | tradDocument}
 */
async function fatchPreviousTrade(candleData) {

    let query = {
        name: SETTINGS.order.name,
        status: "running",
        coin: candleData.symbol,
    }
    let previousTrade = await Trade.find(query)
    if (previousTrade == null) {
        return false
    }
    return previousTrade
}

/**
 * this will check trandCatcher shift available or not and return the shift direction or false
 * @param {Candle Data} candleData 
 * @returns {Boolean | Direction}
 */
function determineTrandCatcherShift(candleData) {
    let shift = candleData.data.trendCatcherShift;
    if (!shift) {
        return false;
    }
    return shift
}






module.exports = {
    HandleTradeOrder
}