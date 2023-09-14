const { createEventAdapter } = require("@slack/events-api");
require("dotenv").config();
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

async function slackMiddleware(req, res) {
  try {
    const slackEvents = createEventAdapter(slackSigningSecret);
    return slackEvents.requestListener();
  } catch (err) {
    console.log(err);
  }
}

module.exports = slackMiddleware;
