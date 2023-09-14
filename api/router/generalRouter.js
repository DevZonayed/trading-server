const express = require("express");

// All Middlewares
const UserAuth = require("../middleware/auth/Authentication");

// All Controllers
const OnlyAdmin = require("../middleware/auth/AdminMiddleware");
const {
  handleGlobalSearch,
  handleCheckMsgBalance,
} = require("../controller/generalController");

// All Routes
const generalRouter = express.Router();
generalRouter.post("/globalsearch", UserAuth, OnlyAdmin, handleGlobalSearch);
generalRouter.post(
  "/checkmsgbalance",
  UserAuth,
  OnlyAdmin,
  handleCheckMsgBalance
);

module.exports = generalRouter;

// Generate email validation reg exp
