const express = require("express");
require("colors");
const mongoConnection = require("./api/config/databaseConfig");
require("dotenv").config();
const cors = require("cors");
const compression = require("compression");
const {
  errorMiddleware,
  notFoundMiddleware,
} = require("./api/middleware/error/errorMiddleware");
const scheduleJobs = require("./api/schedules/scheduleJob");

const path = require("path");

// Schedule Job
scheduleJobs();

// App Initialize
const app = express();

var whitelist = ["https://management.shorobindu.com", "http://localhost:3000"];
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
app.use(
  express.json({
    limit: "50mb",
  })
);
app.use(express.text());
app.use(express.urlencoded({ extended: false }));

app.set("trust proxy", true);

app.get("/", (req, res) => {
  res.json({
    message: "Getting Successful",
  });
});

// Error Middleware
app.use(notFoundMiddleware);
app.use(errorMiddleware);

const PORT = process.env.SERVER_PORT || 7000;
mongoConnection();

module.exports = app;
