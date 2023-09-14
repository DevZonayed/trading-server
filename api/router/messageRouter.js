const express = require("express");

// All Middlewares
const UserAuth = require("../middleware/auth/Authentication");

// All Controllers
const {
  sendMessage,
  getMessageReport,
} = require("../controller/MessageController");
const OnlyAdmin = require("../middleware/auth/AdminMiddleware");

// All Routes
const sessionRouter = express.Router();
sessionRouter.post("/sendsms", UserAuth, sendMessage);
sessionRouter.post("/report", UserAuth, OnlyAdmin, getMessageReport);

module.exports = sessionRouter;
