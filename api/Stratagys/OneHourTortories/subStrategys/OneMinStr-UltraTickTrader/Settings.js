const SETTINGS = {
    strategy: {
        name: "Tortoris_1h",
        symbol: "SOLUSDT",
        // timeframe: 1,
        orderTakeKeys: ["default", "llb", "laso" , "tcst", "stst"]
    },
    order: {
        name: "UltraTickTrader",
        exchange: "Binance",
        leverageType : "Isolated",
        minimumTrendStrength : 5,
        maximumTailSize : 0.15,
        maximumCandleSize : 1,
        minTrendStrength : 15,
        defaultLeverage : 1
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
        UltraTickTraderExecuteError : "Error Occured while execute UltraTickTrader Strategy \n",
        ORDER : {
            cancle : {
                TrandCatcherSmartTrailNotInFavour : "Trand Catcher and Smart Trail don't give any signal!",
                SmartTrailOpositeDirection : "Oposite direction trade found on 'Smart Trail' \n",
                TrendCatcherOpositeDirection : "Oposite direction trade found on 'Trend Catcher' \n",
                LowTrendStrength : "Low Trend Strength \n",
                StrongBullBearOpositeDirection : "Strong Bullish or bearish value is up against signal direction.\n",
                WtLbOpositeGreenLine : "WT_LB Greenline is oposite direction and it's greater then 40. \n",
                MaxTailHapped : "The tail of the order candle if so over! \n",
                MaximumBodySizeNoticed : "Candle low to high percentage is touched maximum candle size \n"
            },
            execute : {
            },
            laverage : {
                OneXAiChannelAiSuperTrendOposite : "Ai Channel and Super Trend Have Oposite Direction\N",
                OneXLowTrendStrength : "Low Trend Strength \n",
                OneXBatterMacdOpositeDirection : "Batter Macd Is in oposite direction\n",
                OneXBarOposite : "Bar Color Is not in favour \n",
                TwoXBatterMacdInSameDirection : "Batter Macd In the same direction\n",
                TwoXAiInSameDirectionNotMacd : "Ai Channel And Ai SuperTrend has same direction of signals but not macd\n",
                ThreeXAllConditionMeet : "Smart Trail , SuperTrend , Ai Channels , Macd ,  Strong bull/ bear \n All Directions in favour\n",
                FiveXAllConditionMeet : "WT_LB Green Line Are Above 40 with same direction\n of the value of the green line of WT_LB \n",
                SixXAllConditionMeet : "Smart Trail , Ai SuperTrend , Ai Channels , Macd , bar color , default candle direction \n All of the values is in favour\n",
                DefaultLeverageMessage : "No Conditions has matched it take from default sourch\n"
            }
        }
    }
}


module.exports = SETTINGS