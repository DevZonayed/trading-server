const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const tradingDataRoutes = require("./app/routes/tradingDataRoutes");
const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("error", (error) =>
  console.error("MongoDB connection error:", error)
);
mongoose.connection.once("open", () => console.log("Connected to MongoDB"));

// app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

// Require your routes here
app.use("/trading-data", tradingDataRoutes);

// app.listen(PORT, () => {
//   console.log(`Server is running on PORT ${PORT}`);
// });

module.exports = app;
