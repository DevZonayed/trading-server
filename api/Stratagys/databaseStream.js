const { aladdinCandleDataStream } = require("./AladdinAi/candleDataStream")
const { candleDataStream } = require("./OneHourTortories/candleDataStream")

function AllDbStream(){
    candleDataStream()
    aladdinCandleDataStream()
}


module.exports = AllDbStream