const SETTINGS = {
    strategy: {
        name: "Tortoris_1h",
        symbol: "BTCUSDT",
        timeframe: 1,
        orderTakeKeys: ["default", "llb", "laso"]
    },
    order: {
        name: "UltraTickTrader",
        exchange: "Binance"
    },
    telegramCradentials: {
        botToken: "6465687056:AAFAoET1Ln3zRRutTy6nvlfT2FAeVvJscMI",
        channelId: "-1002086222625"
    },
    entryPricePercent: 0.02,
    profitTakePercentage: [0.10, 0.30, 1],
    MESSAGES: {
        restartWatching: "Restart Watching...",
        prevCandleFatchProblem : "There is a error while fatching previous candleData \n",
        UltraTickTraderExecuteError : "Error Occured while execute UltraTickTrader Strategy \n"
    }
}


module.exports = SETTINGS