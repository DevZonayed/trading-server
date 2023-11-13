const Trade = require("../../../model/Trade");
const { Telegram } = require("../../../service/Telegram");
const { calculateTwoRangePercentage } = require("../utils");
const SETTINGS = require("../Settings");



/**
 * This function will handle trade leverage
 * @param {candleData} candleData
 * @param {prevCandleData[]} prevCandles
 * @returns
 */
function handleLeverage(direction, candleData, prevCandles) {
    // All Conditions Will Goes Here
    // let OneXTreaty = checkOneXLeverageTreaty(direction, candleData);
    // let TwoXTreaty = checkTwoXLeverageTreaty(direction, candleData);
    // let ThreeXTreaty = checkThreeXLeverageTreaty(direction, candleData);
    // let FiveXTreaty = checkFiveXTreaty(direction, candleData);
    // let SixXTreaty = checkSixXLeverageTreaty(direction, candleData);

    let leverage = 1;
    let reason = "";
    function addCredentials({ leverage: _leverage, reason: _reason }) {
        leverage = _leverage;
        reason = _reason;
    }

    // if (OneXTreaty.status) {
    // if (OneXTreaty.status) {
    if (false) {
        addCredentials(OneXTreaty);
    // } else if (TwoXTreaty.status) {
    } else if (false) {
        addCredentials(TwoXTreaty);
    // } else if (ThreeXTreaty.status) {
    } else if (false) {
        addCredentials(ThreeXTreaty);
    // } else if (FiveXTreaty.status) {
    } else if (false) {
        addCredentials(FiveXTreaty);
    // } else if (SixXTreaty.status) {
    } else if (false) {
        addCredentials(SixXTreaty);
    } else {
        let defaultLeverage = {
            leverage: SETTINGS.order.defaultLeverage,
            reason: SETTINGS.MESSAGES.ORDER.laverage.DefaultLeverageMessage,
        };
        addCredentials(defaultLeverage);
    }

    return {
        value: leverage,
        reason: reason,
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
    let macdDirection = determineBetterMACDdirection(candleData);

    let reason = null;

    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason ? (reason += message) : (reason = message);
    }

    if (aiChannelDirection !== aiSuperTrandDirection) {
        setReason(
            SETTINGS.MESSAGES.ORDER.laverage.OneXAiChannelAiSuperTrendOposite
        );
    }
    if (trendStrength && trendStrength < SETTINGS.order.minTrendStrength) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.OneXLowTrendStrength);
    }
    if (barDirection !== direction) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.OneXBarOposite);
    }
    if (direction !== macdDirection) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.OneXBatterMacdOpositeDirection);
    }

    return {
        status: !!reason,
        leverage: Leverage,
        reason,
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
    let macdDirection = determineBetterMACDdirection(candleData);

    let reason = null;

    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason ? (reason += message) : (reason = message);
    }

    if (direction == macdDirection) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.TwoXBatterMacdInSameDirection);
    }

    if (
        direction == aiChannelDirection &&
        direction == aiSuperTrandDirection &&
        direction !== macdDirection
    ) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.TwoXAiInSameDirectionNotMacd);
    }

    return {
        status: !!reason,
        leverage: Leverage,
        reason,
    };
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
    let aiSuperTrandStrongDirection =
        determinAiSuperTrendStrongDirection(candleData);
    let macdDirection = determineBetterMACDdirection(candleData);
    let smartTrailDirection = candleData?.data?.smartTrailStatus;
    let reason = null;
    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason ? (reason += message) : (reason = message);
    }
    if (
        direction == smartTrailDirection &&
        direction == aiSuperTrandDirection &&
        direction == aiChannelDirection &&
        direction == macdDirection &&
        direction == aiSuperTrandStrongDirection
    ) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.ThreeXAllConditionMeet);
    }
    return {
        status: !!reason,
        leverage: Leverage,
        reason,
    };
}

/**
 * This function will contain 5x leverage conditions
 * @param {Candle Data} candleData
 * @returns {status : Boolean , leverage : Number , reason : string}
 */
function checkFiveXTreaty(direction, candleData) {
    const Leverage = 5;
    let WTGreenLineDirection = determinWTLBGreenLine(candleData);
    let greenLine = Number(candleData?.data?.wtgl);

    let reason = null;
    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason ? (reason += message) : (reason = message);
    }
    if (
        !isNaN(greenLine) &&
        Math.abs(greenLine) > 40 &&
        direction == WTGreenLineDirection
    ) {
        setReason(SETTINGS.MESSAGES.ORDER.laverage.FiveXAllConditionMeet);
    }

    return {
        status: !!reason,
        leverage: Leverage,
        reason,
    };
}

function checkSixXLeverageTreaty(direction, candleData) {
    const Leverage = 6;
    let candleDirection = determindefaultCandleDirection(candleData);
    let aiChannelDirection = determinAiChannelDirection(candleData);
    let aiSuperTrandDirection = determinAiSuperTrendDirection(candleData);
    let barDirection = determinBarColorDirection(candleData);
    let macdDirection = determineBetterMACDdirection(candleData);
    let aiSuperTrandStrongDirection =
        determinAiSuperTrendStrongDirection(candleData);
    let smartTrailDirection = candleData.data.smartTrailStatus;

    let reason = null;
    // This function will help to append reasons
    function setReason(message) {
        if (!message) {
            return false;
        }
        reason ? (reason += message) : (reason = message);
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
        setReason(SETTINGS.MESSAGES.ORDER.laverage.SixXAllConditionMeet);
    }

    return {
        status: !!reason,
        leverage: Leverage,
        reason,
    };
}

/**
 * This function will determine WTLB Green Line
 * @param {Candle Data} candleData
 * @returns {"Long" | "Short" | false}
 */
function determinWTLBGreenLine(candleData) {
    let greenLine = Number(candleData?.data?.wtgl);
    if (isNaN(greenLine)) {
        return false;
    }

    let direction = greenLine > 0 ? "Long" : greenLine < 0 ? "Short" : false;
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
    let direction =
        isNaN(lower) && !isNaN(upper)
            ? "Long"
            : isNaN(upper) && !isNaN(lower)
                ? "Short"
                : false;
    return direction;
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
    return direction;
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
    return direction;
}

function determindefaultCandleDirection(candleData) {
    let candleStatus = candleData.candleStatus;
    candleStatus = Number(candleStatus);
    if (isNaN(candleStatus)) {
        return false;
    }

    let direction =
        candleStatus > 0 ? "Long" : candleStatus < 0 ? "Short" : false;
    return direction;
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
    return direction;
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
    let direction =
        macdLine > signalLine
            ? "Long"
            : macdLine < signalLine
                ? "Short"
                : "Neutral";
    return direction;
}

module.exports = handleLeverage