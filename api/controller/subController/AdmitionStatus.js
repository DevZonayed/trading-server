const AsyncHandler = require("express-async-handler");
const ErrorLog = require("../../model/ErrorLog");
const Order = require("../../model/Order");
const Session = require("../../model/Session");

const getAdmitionStatus = async () => {
  try {
    // Getting All Session
    const allSessions = await Session.find();
    //   Filter out running Sessions
    const runningSessions = allSessions
      .filter((session) => new Date(session.endAt) >= new Date())
      .map((item) => item._id);

    // Get All Running Session Order
    const allOrder = await Order.find({
      "session.id": { $in: runningSessions },
    });

    let todaysOrderReport = getTodaysOrderReport(allOrder);
    let yesterDayOrderReport = getYesterDayOrderReport(allOrder);
    let getAllOrderInfo = getAllOrderReport(allOrder, runningSessions);

    let message = "";
    if (todaysOrderReport.complete < yesterDayOrderReport.complete) {
      message = `Hello fellows,\nLow performance detected\nCompared to yesterday😐`;
    } else {
      message = `Hello fellows,\nGreat Job😍\nWe Have Done Exelent Job Today❤`;
    }
    return {
      message,
      todaysOrderReport,
      yesterDayOrderReport,
      getAllOrderInfo,
    };
  } catch (err) {
    await ErrorLog.create({
      time: new Date(),
      from: "Get Admition Status",
      error: err,
    });
  }
};

module.exports = getAdmitionStatus;

// Get Todays Order Report
function getTodaysOrderReport(order) {
  let completeOrder = 0;
  let cancledOrder = 0;
  let pendingOrder = 0;

  //   Filter Out All
  order
    .filter((item) => new Date(item.orderAt) > new Date(Date.now() - 86400000))
    .map((item) => {
      if (item.status === "pending") {
        pendingOrder += 1;
      } else if (item.status === "processing") {
        completeOrder += 1;
      } else if (item.status === "cancelled") {
        cancledOrder += 1;
      }
    });

  return {
    timeRange: `After (${new Date(Date.now() - 86400000).toLocaleString("en", {
      dateStyle: "short",
    })})`,
    total: completeOrder + cancledOrder + pendingOrder,
    complete: completeOrder,
    cancled: cancledOrder,
    pending: pendingOrder,
  };
}

// Get YesterDays Order Report
function getYesterDayOrderReport(order) {
  let completeOrder = 0;
  let cancledOrder = 0;
  let pendingOrder = 0;

  //   Filter Out All
  order
    .filter(
      (item) =>
        new Date(item.orderAt) > new Date(Date.now() - 172800000) &&
        new Date(item.orderAt) < new Date(Date.now() - 86400000)
    )
    .map((item) => {
      if (item.status === "pending") {
        pendingOrder += 1;
      } else if (item.status === "processing") {
        completeOrder += 1;
      } else if (item.status === "cancelled") {
        cancledOrder += 1;
      }
    });

  return {
    timeRange: `(${new Date(Date.now() - 172800000).toLocaleString("en", {
      dateStyle: "short",
    })}) to (${new Date(Date.now() - 86400000).toLocaleString("en", {
      dateStyle: "short",
    })})`,
    total: completeOrder + cancledOrder + pendingOrder,
    complete: completeOrder,
    cancled: cancledOrder,
    pending: pendingOrder,
  };
}

// Get Full Session Order Report
function getAllOrderReport(order, sessionInfo) {
  let completeOrder = 0;
  let cancledOrder = 0;
  let pendingOrder = 0;

  //   Filter Out All
  order.map((item) => {
    if (item.status === "pending") {
      pendingOrder += 1;
    } else if (item.status === "processing") {
      completeOrder += 1;
    } else if (item.status === "cancelled") {
      cancledOrder += 1;
    }
  });

  return {
    timeRange: `All Report of this session`,
    total: completeOrder + cancledOrder + pendingOrder,
    complete: completeOrder,
    cancled: cancledOrder,
    pending: pendingOrder,
  };
}
