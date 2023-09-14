const express = require("express");
require("colors");
const mongoConnection = require("./api/config/databaseConfig");
require("dotenv").config();
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const {
  errorMiddleware,
  notFoundMiddleware,
} = require("./api/middleware/error/errorMiddleware");
const userRouter = require("./api/router/UserRouter");
const subjectRouter = require("./api/router/SubjectRouter");
const sessionRouter = require("./api/router/SessionRouter");
const emailTemplateRouter = require("./api/router/EmailTemplateRouter");
const SettingsRouter = require("./api/router/SettingsRouter");
const LeadRouter = require("./api/router/LeadRouter");
const messageRouter = require("./api/router/messageRouter");
const mailRouter = require("./api/router/mailRouter");
const dashBordRouter = require("./api/router/dashBordRouter");
const generalRouter = require("./api/router/generalRouter");
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
// app.use(cookieParser());
// User Router
// app.use("/api/v1/user", userRouter);
// app.use("/api/v1/lead", LeadRouter);
// app.use("/api/v1/subject", subjectRouter);
// app.use("/api/v1/session", sessionRouter);
// app.use("/api/v1/template", emailTemplateRouter);
// app.use("/api/v1/settings", SettingsRouter);
// app.use("/api/v1/message", messageRouter);
// app.use("/api/v1/mail", mailRouter);
// app.use("/api/v1/dashbord", dashBordRouter);
// app.use("/api/v1/general", generalRouter);
// app.use("/api/v1/trading-server", generalRouter);

app.get("/", (req, res) => {
  res.json({
    message: "Getting Successful",
  });
});

// Error Middleware
// app.use(notFoundMiddleware);
// app.use(errorMiddleware);

const PORT = process.env.SERVER_PORT || 7000;
mongoConnection();

module.exports = app;
