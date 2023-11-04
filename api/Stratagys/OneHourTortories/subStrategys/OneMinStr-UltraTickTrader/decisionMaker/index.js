const { Telegram } = require("../../../../../service/Telegram");
const { generateMultiCandleTimeRange, generateDateRageFilterMongoose, sortCandlesDescending } = require("../../../utils");
const SETTINGS = require("../Settings");
const CandleData = require("../../../../../model/CandleData");
const { HandleTradeOrder } = require("./OrderValidator");



const telegram = new Telegram(
    SETTINGS.telegramCradentials.botToken,
    SETTINGS.telegramCradentials.channelId
);



async function HandleUltraTickTrader(candleData) {
    try {
        // Fatch Previous Candles
        let currentCandleTime = candleData.time;
        let prevCandles = await previousCandles(currentCandleTime, 2);
        prevCandles.push(candleData)
        prevCandles = sortCandlesDescending(prevCandles);
        // This function will handle order should take or not
        let isValidOrder = HandleTradeOrder(candleData , prevCandles)



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
async function previousCandles(date, count) {
    try {
        // Generate timerange for previous candle
        let candleTimeRange = generateMultiCandleTimeRange(date, SETTINGS.strategy.timeframe, count, 1)
        // Generate Mongoose Date Query with this
        let candleTimeQuery = generateDateRageFilterMongoose(candleTimeRange)
        // Fatch Previous Candles
        let prevCandles = await CandleData.find({
            name: SETTINGS.strategy.name,
            symbol: SETTINGS.strategy.symbol,
            timeframe: SETTINGS.strategy.timeframe,
            time: candleTimeQuery,
        });
        return prevCandles
    } catch (err) {
        telegram.sendMessage(SETTINGS.MESSAGES.prevCandleFatchProblem + `Error = ${err}`);
        return []
    }
}



module.exports = HandleUltraTickTrader