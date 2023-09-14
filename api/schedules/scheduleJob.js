const cron = require("node-cron");
const mapOrder = require("../controller/OrderController");
const getAdmitionStatus = require("../controller/subController/AdmitionStatus");
const ErrorLog = require("../model/ErrorLog");
const SlackMessage = require("./actions/slackNotify");
const sendSmsInfo = require("./actions/smsQuantityNotify");

function scheduleJobs() {
  cron.schedule("*/59 * * * *", () => {
    if (new Date().getHours() === 0) {
      // Something to rub in evey 0
    } else if (new Date().getHours() === 1) {
      // Something to run in 1
    } else if (new Date().getHours() === 2) {
      // Something to run in 2
    } else if (new Date().getHours() === 3) {
      // Something to run in 3
    } else if (new Date().getHours() === 4) {
      // Something to run in 4
    } else if (new Date().getHours() === 5) {
      // Something to run in 5
    } else if (new Date().getHours() === 6) {
      // Something to run in 6
    } else if (new Date().getHours() === 7) {
      // Something to run in 7
    } else if (new Date().getHours() === 8) {
      // Something to run in 8
    } else if (new Date().getHours() === 9) {
      // Something to run in 9
    } else if (new Date().getHours() === 10) {
      // Something to run in 10
    } else if (new Date().getHours() === 11) {
      // Something to run in 11
    } else if (new Date().getHours() === 12) {
      // Something to run in 12
    } else if (new Date().getHours() === 13) {
      // Something to run in 13
    } else if (new Date().getHours() === 14) {
      // Something to run in 14
    } else if (new Date().getHours() === 15) {
      // Something to run in 15
    } else if (new Date().getHours() === 16) {
      // Something to run in 16
      mapOrder(); // Mapping Order from sorobindu.com
    } else if (new Date().getHours() === 17) {
      // Something to run in 17
    } else if (new Date().getHours() === 18) {
      // Something to run in 18
    } else if (new Date().getHours() === 19) {
      // Something to run in 19
    } else if (new Date().getHours() === 20) {
      // Something to run in 20
      sendSmsInfo();
    } else if (new Date().getHours() === 21) {
      // Something to run in 21

      sendAdmitionStatus();
    } else if (new Date().getHours() === 22) {
      // Something to run in 22
    } else if (new Date().getHours() === 23) {
      // Something to run in 23
    } else if (new Date().getHours() === 24) {
      // Something to run in 24
    }
  });
}

module.exports = scheduleJobs;

// Send Slack Notification about order info function
async function sendAdmitionStatus() {
  try {
    let orders = await getAdmitionStatus();
    let notify = new SlackMessage({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${orders.message}`,
            emoji: true,
          },
        },

        {
          type: "divider",
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Type:*\nTodays Order Report`, // Editet
            },
            {
              type: "mrkdwn",
              text: `*TimeRange:*\n${orders.todaysOrderReport.timeRange}`,
            },
            {
              type: "mrkdwn",
              text: `*Total:*\n${orders.todaysOrderReport.total} Order`,
            },
            {
              type: "mrkdwn",
              text: `*Admitted:*\n${orders.todaysOrderReport.complete} Student`,
            },
            {
              type: "mrkdwn",
              text: `*Pending:*\n${orders.todaysOrderReport.pending} Student`,
            },
            {
              type: "mrkdwn",
              text: `*Cancled:*\n${orders.todaysOrderReport.cancled} Student`,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Type:*\nYesterday Order Report`, // Editet
            },
            {
              type: "mrkdwn",
              text: `*TimeRange:*\n${orders.yesterDayOrderReport.timeRange}`,
            },
            {
              type: "mrkdwn",
              text: `*Total:*\n${orders.yesterDayOrderReport.total} Order`,
            },
            {
              type: "mrkdwn",
              text: `*Admitted:*\n${orders.yesterDayOrderReport.complete} Student`,
            },
            {
              type: "mrkdwn",
              text: `*Pending:*\n${orders.yesterDayOrderReport.pending} Student`,
            },
            {
              type: "mrkdwn",
              text: `*Cancled:*\n${orders.yesterDayOrderReport.cancled} Student`,
            },
          ],
        },
        {
          type: "divider",
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Type:*\nAll Order`, // Editet
            },
            {
              type: "mrkdwn",
              text: `*TimeRange:*\n${orders.getAllOrderInfo.timeRange}`,
            },
            {
              type: "mrkdwn",
              text: `*Total:*\n${orders.getAllOrderInfo.total} Order`,
            },
            {
              type: "mrkdwn",
              text: `*Admitted:*\n${orders.getAllOrderInfo.complete} Student`,
            },
            {
              type: "mrkdwn",
              text: `*Pending:*\n${orders.getAllOrderInfo.pending} Student`,
            },
            {
              type: "mrkdwn",
              text: `*Cancled:*\n${orders.getAllOrderInfo.cancled} Student`,
            },
          ],
        },
        {
          type: "divider",
        },
      ],
    });
    notify.toDynamicManagementReport();
  } catch (err) {
    await ErrorLog.create({
      time: new Date(),
      from: "Send Admition Status",
      error: err,
    });
  }
}
