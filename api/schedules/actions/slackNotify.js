const axios = require("axios");
require("dotenv").config();
const AsyncHandler = require("express-async-handler");
const ErrorLog = require("../../model/ErrorLog");

class SlackMessage {
  constructor(msgObj) {
    this.msgObj = msgObj;
  }

  toRidam() {
    let thisVariables = this;
    (async function () {
      try {
        await axios.post(process.env.SLACK_RIDAM_PAUL, thisVariables.msgObj);
      } catch (err) {
        await ErrorLog.create({
          time: new Date(),
          from: "Send to ridam vai",
          error: err,
        });
      }
    })();
    return this;
  }
  toJillur() {
    let thisVariables = this;
    (async function () {
      try {
        await axios.post(process.env.SLACK_JILLUR_RAHMAN, thisVariables.msgObj);
      } catch (err) {
        await ErrorLog.create({
          time: new Date(),
          from: "Send to Jillur vai",
          error: err,
        });
      }
    })();
    return this;
  }
  toDynamicNotify() {
    let thisVariables = this;
    (async function () {
      try {
        await axios.post(
          process.env.SLACK_DYNAMIC_NOTIFY,
          thisVariables.msgObj
        );
      } catch (err) {
        await ErrorLog.create({
          time: new Date(),
          from: "Send to Daynamic Notify Channel",
          error: err,
        });
      }
    })();
    return this;
  }
  toDynamicManagementReport() {
    let thisVariables = this;
    (async function () {
      try {
        await axios.post(
          process.env.DYNAMIC_MANAGEMENT_UPDATE_CHANNEL,
          thisVariables.msgObj
        );
      } catch (err) {
        await ErrorLog.create({
          time: new Date(),
          from: "Send to Dynamic Management Report",
          error: err,
        });
      }
    })();
    return this;
  }
}

module.exports = SlackMessage;
