const Trade = require("../../../../../model/Trade");
const { Telegram } = require("../../../../../service/Telegram");
const { calculateTwoRangePercentage } = require("../../../utils");
const SETTINGS = require("../Settings");
const handleLeverage = require("./HandleLeverage");

const telegram = new Telegram(
    SETTINGS.telegramCradentials.botToken,
    SETTINGS.telegramCradentials.channelId
);

/**
 * This function will handle all of the condition that nessesary for order execute
 * @param {CandleData{}} candleData
 * @param {CandleData[]} prevCandles
 * @returns {{isExecutable , reason , direction}}
 */
async function HandleTradeOrder(candleData, prevCandles) {
    // Check Previous Order
    let prevTrade = await fatchPreviousTrade(candleData);
    if (prevTrade) {
        return handleTradeWithExistingTrade(
            prevTrade,
            candleData,
            prevCandles
        );
    }

    return await handleTrade({ candleData, prevCandles });
}

/**
 * 
 * @param {} param0 
 * @returns 
 */
async function handleTrade({candleData, prevCandles }) {
    const tradeValidity = checkTradeValidity(candleData);
    const seonderyTrendValidityShift = determineTrendCatcherShift(candleData);
    
    if (!canExecuteTrade(tradeValidity, seonderyTrendValidityShift, candleData)) {
        return false;
    }

    let direction = tradeValidity.direction || seonderyTrendValidityShift;
    if (isFalsifiableTrade(direction, candleData, prevCandles)) {
        return false; // telegram.falseOrder is called within isFalsifiableTrade
    }

    const leverageDetails = handleLeverage(direction, candleData, prevCandles);
    leverageAlert(leverageDetails);

    const tradeDetails = constructTradePayload(direction, candleData, leverageDetails.value);
    return await executeTrade(tradeDetails);
}

function checkTradeValidity(candleData) {
    return isValidTrade(candleData);
}

function canExecuteTrade(tradeValidity, seonderyTrendValidityShift, candleData) {
    return tradeValidity.status || seonderyTrendValidityShift;
}

function isFalsifiableTrade(direction, candleData, prevCandles) {
    const falsifyResult = isTradeFalsifiable({ direction, candleData, prevCandles });
    if (falsifyResult) {
        telegram.falseOrder({
            direction,
            reason: falsifyResult,
        });
    }
    return falsifyResult;
}

function leverageAlert(leverageDetails) {
    telegram.sendMessage(
        `Trade Leverage Gonna be ${leverageDetails.value} \n Reason : ${leverageDetails.reason}`
    );
}

function constructTradePayload(direction, candleData, leverage) {
    const entryPriceKey = direction === "Long" ? 'longEntryPrice' : 'shortEntryPrice';
    const profitTakeKey = direction === "Long" ? 'longProfitTakeZones' : 'shortProfitTakeZones';

    return {
        name: SETTINGS.order.name,
        status: "running",
        coin: candleData.symbol,
        exchange: SETTINGS.order.exchange,
        leverage,
        leverageType: SETTINGS.order.leverageType,
        direction,
        entryPrice: candleData[entryPriceKey],
        profitTakeZones: candleData[profitTakeKey],
    };
}

async function executeTrade(tradeDetails) {
    return await handleTradeExecute(tradeDetails);
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
            targets: payload.profitTakeZones,
        });
        // Create Order In Database
        await Trade.create(payload);
    } catch (err) {
        telegram.sendMessage(
            "Something went wrong while create order in DB\n" + JSON.stringify(err)
        );
    }
}



/**
 * This mathod will try to protect falst trade
 * @param {Direction , candleData} param0
 * @returns
 */
function isTradeFalsifiable({ direction, candleData }) {
    // Strong Bullish Or Bearish Assets
    let strongBull = Math.abs(candleData.data.strongBullish) > 0 ? true : false;
    let strongBear = Math.abs(candleData.data.strongBearish) > 0 ? true : false;

    // WT_LB Assets
    let bullishWtgl =
        candleData.data.wtgl >= 0 && candleData.data.wtgl >= 40 ? true : false;
    let bearishWtgl =
        candleData.data.wtgl < 0 && Math.abs(candleData.data.wtgl) >= 40
            ? true
            : false;

    // Default Assets
    let trendStrength = candleData.data.trendStrength;
    let bodySize = candleData.bodySize;
    let lowerTail = candleData.lowerTail;
    let upperTail = candleData.upperTail;

    let reason = null;

    function addResons(message) {
        reason
            ? reason += message
            : reason = message
    }

    // 1
    if (
        (direction == "Long" && strongBear) ||
        (direction == "Short" && strongBull)
    ) {
        addResons(SETTINGS.MESSAGES.ORDER.cancle.StrongBullBearOpositeDirection)
    }
    // 2
    if (
        (bullishWtgl && direction == "Short") ||
        (bearishWtgl && direction == "Long")
    ) {
        addResons(SETTINGS.MESSAGES.ORDER.cancle.WtLbOpositeGreenLine)
    }
    // 3
    if (trendStrength < SETTINGS.order.minimumTrendStrength) {
        addResons(SETTINGS.MESSAGES.ORDER.cancle.LowTrendStrength)
    }
    // 4
    if (
        bodySize > SETTINGS.order.maximumTailSize &&
        bodySize < Math.max(lowerTail, upperTail)
    ) {
        addResons(SETTINGS.MESSAGES.ORDER.cancle.MaxTailHapped)
    }
    // 5
    if (bodySize + upperTail + lowerTail > SETTINGS.order.maximumCandleSize) {
        addResons(SETTINGS.MESSAGES.ORDER.cancle.MaximumBodySizeNoticed)

    }

    return reason;
}

/**
 * This mathod is responsible for take dicision if there is a existing trade
 * @param {Boolean | String} isPrimaryTrade
 * @param {Boolean | String} seonderyTrendValidityShift
 * @param {TadeObj{}} prevTrade
 * @param {CurrenctCandle{}} candleData
 * @param {PreviousCandle[]} prevCandles
 * @returns
 */
async function handleTradeWithExistingTrade(
    prevTrade,
    candleData,
    prevCandles
) {
    // If needed then close the order
    let closeResult = await handleCloseTrend(candleData, prevTrade);

    if (!closeResult) {
        return false;
    }

    // Give the trade for execute
    let treadPayload = {
        candleData,
        prevCandles
    };
    handleTrade(treadPayload);
}

/**
 * This function will make dicition for closing order or not
 * @param {*} param0
 */
async function handleCloseTrend(candleData, prevTrade) {
    try {
        // Check order close reason
        let reason = handleTradeCloseResons(candleData, prevTrade);
        let profitMargin = calculateTwoRangePercentage(
            prevTrade.entryPrice,
            prevTrade.direction,
            candleData.close
        );
        let leverage = prevTrade.leverage;
        if (reason) {
            await sendOrderCloseAlertAlert(leverage, profitMargin , reason)
            // Update the order
            await handleCloseOrderActions(prevTrade , candleData, reason, profitMargin)
            return true;
        }
        return false;
    } catch (err) {
        console.error(err)
    }
}


async function handleCloseOrderActions(prevTrade,candleData , reason, profitMargin) {
    try {

        // Send Order to telegram
        await telegram.closeOrder({
            coin: prevTrade.coin,
        });

        await Trade.updateOne(
            { _id: prevTrade._id },
            {
                status: "closed",
                endPrice: candleData.close,
                reason: reason,
                isProfitable: profitMargin > 0,
                profitMargin,
            }
        )

        return true
    } catch (err) {
        await telegram.sendMessage(
            "Error Occured while updating the order on db for close \n Error:" +
            JSON.stringify(err)
        );
    }
}


/**
 * This function will send the leverage alert to telegram
 * @param {Number} leverage 
 * @param {Number} profitMargin 
 * @returns 
 */
function sendOrderCloseAlertAlert(leverage, profitMargin , reason) {
    let message = `Previous Thread will close,
    Your Profit would be: ${profitMargin}%
    And your Profit With Leverage would be: ${(profitMargin * leverage).toString()}
    Reason:
    ${reason}`;

    return telegram.sendMessage(message)
}

/**
 * This function will be responsible for closing order
 * @param {Object} candleData Candle data with extra info
 * @returns
 */
function handleTradeCloseResons(candleData, prevTrade) {
    let { smartTrailShift, seonderyTrendValidityShift, trendStrength } =
        candleData.data;
    let prevTradeDirection = prevTrade.direction;

    let reason = null;

    if (smartTrailShift && prevTradeDirection !== smartTrailShift) {
        reason
            ? (reason += SETTINGS.MESSAGES.ORDER.cancle.SmartTrailOpositeDirection)
            : (reason = SETTINGS.MESSAGES.ORDER.cancle.SmartTrailOpositeDirection);
    }

    if (seonderyTrendValidityShift && prevTradeDirection !== seonderyTrendValidityShift) {
        reason
            ? (reason += SETTINGS.MESSAGES.ORDER.cancle.TrendCatcherOpositeDirection)
            : (reason = SETTINGS.MESSAGES.ORDER.cancle.TrendCatcherOpositeDirection);
    }

    if (trendStrength <= 1) {
        reason
            ? (reason += SETTINGS.MESSAGES.ORDER.cancle.LowTrendStrength)
            : (reason = SETTINGS.MESSAGES.ORDER.cancle.LowTrendStrength);
    }

    // Return the resion
    return reason;
}

/**
 * This function will help to determin primari criteria for executing trade
 * @param {Current Candle Document} candleData
 * @returns
 */
function isValidTrade(candleData) {
    let direction = candleData.data.smartTrailShift;
    let status = direction !== null;
    return {
        status,
        direction,
    };
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
    };
    let previousTrade = await Trade.findOne(query);
    if (previousTrade == null) {
        return false;
    }
    return previousTrade;
}

/**
 * this will check trandCatcher shift available or not and return the shift direction or false
 * @param {Candle Data} candleData
 * @returns {Boolean | Direction}
 */
function determineTrendCatcherShift(candleData) {
    let shift = candleData.data.trendCatcherShift;
    if (!shift) {
        return false;
    }
    return shift;
}

module.exports = {
    HandleTradeOrder,
};
