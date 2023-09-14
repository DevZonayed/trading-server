const AsyncHandler = require("express-async-handler");
const Lead = require("../model/Lead");
const SslWaireless = require("../schedules/actions/sslwireless");

/**
 * @route "/api/v1/general/globalsearch"
 * @desc "This Controler is for global searching
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const handleGlobalSearch = AsyncHandler(async (req, res, next) => {
  let { searchValue } = req.body;

  let leads = await Lead.find({
    $or: [
      {
        name: new RegExp(searchValue, "i"),
      },
      {
        phone: new RegExp(searchValue, "i"),
      },
      {
        email: new RegExp(searchValue, "i"),
      },
    ],
  })
    // .sort({ updatedAt: 1 })
    .sort({ createdAt: -1 })
    .select("_id name phone email")
    .limit(10);

  res.json({
    message: "Result Get Success",
    lead: leads,
  });
});

/**
 * @route "/api/v1/general/checkmsgbalance"
 * @desc "This Controler is for Check Message Balance in SSLWIRELESS
 * @Access { Private }
 * @method "get"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const handleCheckMsgBalance = AsyncHandler(async (req, res, next) => {
  const bodyVal = req.body;
  let sslWairless = new SslWaireless();
  let result = await sslWairless.checkBalance(bodyVal);
  res.status(200);
  res.json({
    message: "Sms Balance data get success",
    data: result.data,
  });
});

module.exports = { handleGlobalSearch, handleCheckMsgBalance };
