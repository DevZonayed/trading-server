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
    let trendCatcherShift = determineTrandCatcherShift(candleData)

    // Check Previous Order
    let prevTrade = await fatchPreviousTrade(candleData);
    if (prevTrade) {
        return handleTradeWithExistingTrade(isPrimaryTrade, trendCatcherShift, prevTrade, candleData, prevCandles)
    }
    // Check IF tread actionable or not
    if (!isPrimaryTrade.status && !trendCatcherShift) {
        return {
            isExecutable: false,
            reson: SETTINGS.MESSAGES.ORDER.cancle.TrandCatcherSmartTrailNotInFavour
        }
    }


    let direction = isPrimaryTrade.direction ? isPrimaryTrade.direction : trendCatcherShift;

    await handleTrade({ candleData, direction, prevCandles })


}


/**
 * This function will be responsible for execute trade
 * @param {direction , candleData} param0 
 */
async function handleTrade({ direction, candleData, prevCandles }) {
    let isFalseTrade = isTradeFalsifiable({ direction, candleData, prevCandles });

    if (isFalseTrade) {
        telegram.falseOrder({
            direction,
            reason: isFalseTrade
        })
        return false
    }

    let processedLeverage = handleLeverage(direction, candleData, prevCandles);

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
function handleLeverage(direction, candleData, prevCandles) {
    // All Conditions Will Goes Here
    let OneXTreaty = checkOneXLeverageTreaty(direction, candleData);
    let TwoXTreaty = checkTwoXLeverageTreaty(direction, candleData);
    let ThreeXTreaty = checkThreeXLeverageTreaty(direction, candleData);
    let FiveXTreaty = checkFiveXTreaty(direction, candleData);
    let SixXTreaty = checkSixXLeverageTreaty(direction, candleData);

    let leverage = 1;
    let reason = "";
    function addCredentials({
        leverage : _leverage,
        reason : _reason
    }) {
        leverage = _leverage;
        reason = _reason;
    }

    if(OneXTreaty.status){
        addCredentials(OneXTreaty)
    }else if(TwoXTreaty.status){
        addCredentials(TwoXTreaty)
    }else if(ThreeXTreaty.status){
        addCredentials(ThreeXTreaty)
    }else if(FiveXTreaty.status){
        addCredentials(FiveXTreaty)
    }else if(SixXTreaty.status){
        addCredentials(SixXTreaty)
    }else{
        let defaultLeverage = {
            leverage : SETTINGS.order.defaultLeverage,
            reason : SETTINGS.MESSAGES.ORDER.laverage.DefaultLeverageMessage
        }
        addCredentials(defaultLeverage)
    }

    return {
        value: leverage,
        reson : reason
    };
}

/**
 * This function will contain 1x leverage conditions
 * @param {*} candleData 
 * @returns {status : Boolean , leverage : Number , reason : string}
 */
function checkOneXLeverageTreaty(direction, candleData) {
    const Leverage = 1;
    let aiChannelDirection = determinAiChannelDirection(candleData);
    let aiSuperTrandDirection = determinAiSuperTrendDirection(candleData);
    let trendStrength = candleData.data.trendStrength;
    let barDirection = determinBarColorDirection(candleData);
    let macdDirection = determineBetterMACDdirection(candleData)

    let reason = null;

    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason
            ? reason += message
            : reason = message;
    }

    if (aiChannelDirection !== aiSuperTrandDirection) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.OneXAiChannelAiSuperTrendOposite)
    }
    if (trendStrength && trendStrength < SETTINGS.order.minTrendStrength) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.OneXLowTrendStrength)

    }
    if (barDirection !== direction) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.OneXBarOposite)
    }
    if (direction !== macdDirection) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.OneXBatterMacdOpositeDirection)
    }

    return {
        status: !!reason,
        leverage: Leverage,
        reason
    };


}


/**
 * This function will contain 2x leverage conditions
 * @param {*} candleData 
 * @returns {status : Boolean , leverage : Number , reason : string}
 */
function checkTwoXLeverageTreaty(direction, candleData) {
    const Leverage = 2;
    let aiChannelDirection = determinAiChannelDirection(candleData);
    let aiSuperTrandDirection = determinAiSuperTrendDirection(candleData);
    let macdDirection = determineBetterMACDdirection(candleData)

    let reason = null;


    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason
            ? reason += message
            : reason = message;
    }

    if (direction == macdDirection) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.TwoXBatterMacdInSameDirection)
    }

    if (direction == aiChannelDirection && direction == aiSuperTrandDirection && direction !== macdDirection) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.TwoXAiInSameDirectionNotMacd)
    }

    return {
        status: !!reason,
        leverage: Leverage,
        reason
    }


}

/**
 * This function will contain 2x leverage conditions
 * @param {*} candleData 
 * @returns {status : Boolean , leverage : Number , reason : string}
 */
function checkThreeXLeverageTreaty(direction, candleData) {
    const Leverage = 3;
    let aiChannelDirection = determinAiChannelDirection(candleData);
    let aiSuperTrandDirection = determinAiSuperTrendDirection(candleData);
    let aiSuperTrandStrongDirection = determinAiSuperTrendStrongDirection(candleData);
    let macdDirection = determineBetterMACDdirection(candleData)
    let smartTrailDirection = candleData?.data?.smartTrailStatus;
    let reason = null;
    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason
            ? reason += message
            : reason = message;
    }
    if (
        direction == smartTrailDirection
        && direction == aiSuperTrandDirection
        && direction == aiChannelDirection
        && direction == macdDirection
        && direction == aiSuperTrandStrongDirection
    ) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.ThreeXAllConditionMeet)
    }
    return {
        status: !!reason,
        leverage: Leverage,
        reason
    }


}

/**
 * This function will contain 5x leverage conditions
 * @param {Candle Data} candleData 
 * @returns {status : Boolean , leverage : Number , reason : string}
 */
function checkFiveXTreaty(direction, candleData) {
    const Leverage = 5;
    let WTGreenLineDirection = determinWTLBGreenLine(candleData)
    let greenLine = Number(candleData?.data?.wtgl);

    let reason = null;
    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason
            ? reason += message
            : reason = message;
    }
    if (!isNaN(greenLine) && Math.abs(greenLine) > 40 && direction == WTGreenLineDirection) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.FiveXAllConditionMeet)
    }

    return {
        status: !!reason,
        leverage: Leverage,
        reason
    }
}


function checkSixXLeverageTreaty(direction, candleData) {
    const Leverage = 6;
    let candleDirection = determindefaultCandleDirection(candleData)
    let aiChannelDirection = determinAiChannelDirection(candleData);
    let aiSuperTrandDirection = determinAiSuperTrendDirection(candleData);
    let barDirection = determinBarColorDirection(candleData);
    let macdDirection = determineBetterMACDdirection(candleData)
    let aiSuperTrandStrongDirection = determinAiSuperTrendStrongDirection(candleData);
    let smartTrailDirection = candleData.data.smartTrailStatus;


    let reason = null;
    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason
            ? reason += message
            : reason = message;
    }

    if (
        direction == smartTrailDirection &&
        direction == aiSuperTrandDirection &&
        direction == aiChannelDirection &&
        direction == macdDirection &&
        direction == barDirection &&
        direction == candleDirection &&
        direction == aiSuperTrandStrongDirection
    ) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.SixXAllConditionMeet)
    }

    return {
        status: !!reason,
        leverage: Leverage,
        reason
    }
}

/**
 * This function will determine WTLB Green Line
 * @param {Candle Data} candleData 
 * @returns {"Long" | "Short" | false}
 */
function determinWTLBGreenLine(candleData) {
    let greenLine = Number(candleData?.data?.wtgl);
    if (isNaN(greenLine)) {
        return false
    }

    let direction = greenLine > 0 ? "Long" : greenLine < 0 ? "Short" : false
    return direction;
}


/**
 * this function is for determine Ai Channels indicator direction
 * @param {Candle Data} candleData 
 * @returns {"Long" | "Short" | false}
 */
function determinAiChannelDirection(candleData) {
    let upper = candleData?.data?.upper;
    let lower = candleData?.data?.lower;
    let direction = isNaN(lower) && !isNaN(upper) ? "Long" : isNaN(upper) && !isNaN(lower) ? "Short" : false;
    return direction
}


/**
 * this function is for determine Ai Super Trand indicator's direction
 * @param {Candle Data} candleData 
 * @returns {"Long" | "Short" | false}
 */
function determinAiSuperTrendDirection(candleData) {
    let consensus = candleData?.data?.consensus;
    if (isNaN(consensus)) {
        return false;
    }
    let direction = +consensus > 0 ? "Long" : +consensus < 0 ? "Short" : false;
    return direction
}


/**
 * This function is for determine Ai Super Trand indicator's Strong direction
 * @param {Candle Data} candleData 
 * @returns {"Long" | "Short" | false}
 */
function determinAiSuperTrendStrongDirection(candleData) {
    let strongBullish = Math.abs(candleData?.data?.strongBullish);
    let strongBearish = Math.abs(candleData?.data?.strongBearish);
    if (!strongBearish && !strongBullish) {
        return false;
    }

    let direction = !!strongBullish ? "Long" : !!strongBearish ? "Short" : false;
    return direction
}


function determindefaultCandleDirection(candleData) {
    let candleStatus = candleData.candleStatus;
    candleStatus = Number(candleStatus);
    if (isNaN(candleStatus)) {
        return false
    }

    let direction = candleStatus > 0 ? "Long" : candleStatus < 0 ? "Short" : false
    return direction
}


/**
 * This function will determin the trade direction based on candle color
 * @param {Candle Data} candleData 
 * @returns {"Long" | "Short" | "Neutral"}
 */
function determinBarColorDirection(candleData) {
    let barColor = +candleData?.data?.candleColor;
    if (isNaN(barColor)) {
        return false;
    }
    let direction = barColor > 0 ? "Long" : barColor < 0 ? "Short" : "Neutral";
    return direction
}

/**
 * This function will determin the trade direction based on MACD Line
 * @param {Candle Data} candleData 
 * @returns {"Long" | "Short" | "Neutral"}
 */
function determineBetterMACDdirection(candleData) {
    let macdLine = candleData?.data?.macdLine;
    let signalLine = candleData?.data?.signalLine;
    if (isNaN(macdLine) || isNaN(signalLine)) {
        return false;
    }
    let direction = macdLine > signalLine ? "Long" : macdLine < signalLine ? "Short" : "Neutral";
    return direction;
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
 * @param {Boolean | String} trendCatcherShift 
 * @param {TadeObj{}} prevTrade 
 * @param {CurrenctCandle{}} candleData 
 * @param {PreviousCandle[]} prevCandles 
 * @returns 
 */
async function handleTradeWithExistingTrade(isPrimaryTrade, trendCatcherShift, prevTrade, candleData, prevCandles) {
    // If needed then close the order
    let closeResult = await handleCloseTrend({ ...candleData, prevTrade, trendCatcherShift });

    if (!closeResult || !isPrimaryTrade.status || !trendCatcherShift) {
        return false;
    }

    // Give the trade for execute
    let treadPayload = {
        direction: isPrimaryTrade.direction,
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

        let { prevTrade, trendCatcherShift } = candleData;

        // Check order close resons
        let reson = handleTradeCloseResons({ ...candleData.data, prevTrade, trendCatcherShift })
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
        telegram.sendMessage("Error Occured while updating the order on db for close \n Error:" + JSON.stringify(err))
    }
}

/**
 * This function will be responsible for closing order
 * @param {Object} candleData Candle data with extra info
 * @returns 
 */
function handleTradeCloseResons(candleData) {
    let { prevTrade, smartTrailShift, trendCatcherShift, trendStrength } = candleData;
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
    let status = direction !== null;
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
    let previousTrade = await Trade.findOne(query)
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