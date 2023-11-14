const Trade = require("../../../model/Trade");
const { Telegram } = require("../../../service/Telegram");
const { calculateTwoRangePercentage } = require("../utils");
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
async function handleTrade({ candleData, prevCandles }) {
    const tradeValidity = checkTradeValidity(candleData);
    const seonderyTrendValidityDirection = determineSeonderyTrendValidityShift(candleData, prevCandles);

    if (!canExecuteTrade(tradeValidity, seonderyTrendValidityDirection, candleData)) {
        return false;
    }

    let direction = tradeValidity.direction;
    let isFalseOrder = isTradeFalsifiable({ direction, candleData, prevCandles })
    if (isFalseOrder) {
        sendFalseOrderAlert(direction, isFalseOrder);
        return false; // telegram.falseOrder is called within isFalsifiableTrade
    }

    const leverageDetails = handleLeverage(direction, candleData, prevCandles);
    leverageAlert(leverageDetails);

    const tradeDetails = constructTradePayload(direction, candleData, leverageDetails.value);
    return await executeTrade(tradeDetails);
}


function sendFalseOrderAlert(direction, reason) {
    telegram.falseOrder({
        direction,
        reason,
    });
}



function checkTradeValidity(candleData) {
    return isValidTrade(candleData);
}

function canExecuteTrade(tradeValidity, seonderyTrendValidityDirection, candleData) {

    if (tradeValidity.direction == seonderyTrendValidityDirection) {
        return true;
    }

    return tradeValidity.status;
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
        candleId: candleData._id
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

    // Default Assets
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
        bodySize > SETTINGS.order.maximumTailSize &&
        bodySize < Math.max(lowerTail, upperTail)
    ) {
        addResons(SETTINGS.MESSAGES.ORDER.cancle.MaxTailHapped)
    }
    // 3
    if (bodySize + upperTail + lowerTail > SETTINGS.order.maximumCandleSize) {
        addResons(SETTINGS.MESSAGES.ORDER.cancle.MaximumBodySizeNoticed)

    }

    return reason;
}

/**
 * This mathod is responsible for take dicision if there is a existing trade
 * @param {Boolean | String} isPrimaryTrade
 * @param {Boolean | String} seonderyTrendValidityDirection
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
    let closeResult = await handleCloseTrend(candleData, prevCandles, prevTrade);

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
async function handleCloseTrend(candleData, prevCandles, prevTrade) {
    try {
        // Check order close reason
        let reason = handleTradeCloseResons(candleData, prevCandles, prevTrade);
        let profitMargin = calculateTwoRangePercentage(
            prevTrade.entryPrice,
            prevTrade.direction,
            candleData.close
        );
        let leverage = prevTrade.leverage;
        if (reason) {
            await sendOrderCloseAlertAlert(leverage, profitMargin, reason)
            // Update the order
            await handleCloseOrderActions(prevTrade, candleData, reason, profitMargin)
            return true;
        }
        return false;
    } catch (err) {
        console.error(err)
    }
}


async function handleCloseOrderActions(prevTrade, candleData, reason, profitMargin) {
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
function sendOrderCloseAlertAlert(leverage, profitMargin, reason) {
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
function handleTradeCloseResons(candleData, prevCandles, prevTrade) {
    let prevTradeDirection = prevTrade.direction;
    let hullLineDirection = determineHullLineDirection(candleData)
    let batterMacdDirection = determineBatterMacdDirection(candleData)
    let reason = null;

    if (prevTradeDirection !== hullLineDirection) {
        reason
            ? (reason += SETTINGS.MESSAGES.ORDER.cancle.HullLineOposite)
            : (reason = SETTINGS.MESSAGES.ORDER.cancle.HullLineOposite);
    }

    if (prevTradeDirection !== batterMacdDirection) {
        reason
            ? (reason += SETTINGS.MESSAGES.ORDER.cancle.MacdDirectionOposite)
            : (reason = SETTINGS.MESSAGES.ORDER.cancle.MacdDirectionOposite);
    }

    return reason;
}

/**
 * This function will help to determin primari criteria for executing trade
 * @param {Current Candle Document} candleData
 * @returns
 */
function isValidTrade(candleData) {
    let { strongBullish10, strongBearish10, hullLong10, hullShort10 } = candleData.data
    let macdDirection = determineBatterMacdDirection(candleData)

    let strongDirection =
        !!strongBullish10 && !!hullLong10
            ? "Long"
            : !!strongBearish10 && hullShort10
                ? "Short"
                : null;

    let direction = macdDirection == strongDirection ? strongDirection : null



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
    try {
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

    } catch (err) {
        console.warn(err)
    }
}


function determineHullLineDirection(candleData) {
    const { hullLong, hullShort } = candleData.data;
    let direction = !!hullLong ? "Long" : !!hullShort ? "Short" : null
    return direction
}


function determineBatterMacdDirection(candleData) {
    const { signalLine10, macdLine10 } = candleData.data
    let macdDirection = macdLine10 > signalLine10 ? "Long" : macdLine10 <= signalLine10 ? "Short" : null
    return macdDirection
}

function determineSeonderyTrendValidityShift(candleData, prevCandles) {
    // let seonderyTrendValidityDirection = determineTrendCatcherShift(candleData)
    // let AiChannelShift = determineAiChannelShift(candleData , prevCandles)

    let hullDirection = determineHullLineDirection(candleData)


    return hullDirection;
    // return AiChannelShift;
}

module.exports = {
    HandleTradeOrder,
};
