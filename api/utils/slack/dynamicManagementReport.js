const AsyncHandler = require("express-async-handler");
const axios = require("axios");

/**
 * This will Work for Sending message to slack Dynamic Management Report
 * This will take Message Object
 */
const sendToDynamicManagementReport = AsyncHandler(async (messageObj) => {
  await axios.post(process.env.DYNAMIC_MANAGEMENT_UPDATE_CHANNEL, {
    ...messageObj,
  });
});

module.exports = sendToDynamicManagementReport;
