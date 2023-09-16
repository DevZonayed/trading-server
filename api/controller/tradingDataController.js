const TradingData = require("../model/TradingData");

// Implement your controller logic here
// Example: Handling POST requests for TradingView data
exports.createTradingData = async (req, res) => {
  try {
    if (!Object.values(req.body).includes("")) {
      const newData = new TradingData({
        data: JSON.stringify(req.body),
      });
      await newData.save();
    }
    console.log("//================================//");
    console.log(req.body);
    res.status(201).json({
      message: "Success",
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
