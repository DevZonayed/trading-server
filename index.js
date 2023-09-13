const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const tradingDataRoutes = require("./app/routes/tradingDataRoutes");

const app = express();
// var whitelist = ["https://management.shorobindu.com", "http://localhost:3000"];
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
// app.use(cors(corsOptions));
// All middleware goes here
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.text());
app.use(express.json());

// User Router
app.use("/trading-data", tradingDataRoutes);

const PORT = process.env.SERVER_PORT || 7000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on("error", (error) =>
  console.error("MongoDB connection error:", error)
);
mongoose.connection.once("open", () => console.log("Connected to MongoDB"));

module.exports = app;
