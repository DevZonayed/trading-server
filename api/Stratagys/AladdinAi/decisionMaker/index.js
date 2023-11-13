const SETTINGS = require("../Settings");
const { HandleTradeOrder } = require("./OrderValidator");
const CandleData = require("../../../model/CandleData");
const { Telegram } = require("../../../service/Telegram");
const { sortCandlesDescending } = require("../utils");



const telegram = new Telegram(
    SETTINGS.telegramCradentials.botToken,
    SETTINGS.telegramCradentials.channelId
);



async function HandleAladdinAi(candleData) {
    try {
        // Fatch Previous Candles
        let prevCandles = await previousCandles(candleData, 3);
        prevCandles = sortCandlesDescending(prevCandles);
        // This function will handle order should take or not
        HandleTradeOrder(candleData , prevCandles)


    } catch (err) {
        telegram.sendMessage(SETTINGS.MESSAGES.UltraTickTraderExecuteError + `Error : ${err}`);
    }
}

/**
 * This is a helper function that will help te fatch and return previous candle data 
 * according to paramiters
 * @param {DATE} date 
 * @param {number} count 
 * @returns {{candleData}[]}
 */
async function previousCandles({timeframe , symbol , name}, count) {
    try {
        // Fatch Previous Candles
        let prevCandles = await CandleData.find({
            name,
            symbol,
            timeframe,
        }).sort({ createdAt: -1 }).limit(count);
        return prevCandles
    } catch (err) {
        telegram.sendMessage(SETTINGS.MESSAGES.prevCandleFatchProblem + `Error = ${err}`);
        return []
    }
}



module.exports = HandleAladdinAi