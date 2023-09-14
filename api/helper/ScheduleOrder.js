const schedule = require("node-schedule");
const mapOrder = require("../controller/OrderController");
const ErrorLog = require("../model/ErrorLog");

function ScheduleOrder() {
  schedule.scheduleJob("02 04 * * 1-6", () => {
    // mapOrder();
  });
}

module.exports = ScheduleOrder;
