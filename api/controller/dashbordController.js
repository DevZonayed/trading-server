const AsyncHandler = require("express-async-handler");
const {
  filteringLeads,
  getAllFollowUps,
  getAdmittedLeadAgentReport,
  getSessionReport,
} = require("../helper/controllerUtils");
const Lead = require("../model/Lead");
const Session = require("../model/Session");
const User = require("../model/User");
const getAdmitionStatus = require("./subController/AdmitionStatus");

/**
 * @route "/api/v1/dashbord/agent"
 * @desc "This Controler Will help for geting Agent Dashbord Data
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const getAgentDashBord = AsyncHandler(async (req, res, next) => {
  const { id } = req.body;
  const user = await User.findById(id).select("expaired");
  if (user === null) {
    let error = new Error("Invalid Request !");
    res.status(400);
    next(error);
  }
  // Getting Running Sessions

  let runningSessions = [...(await Session.find().select("_id endAt"))]
    ?.filter((item) => new Date(item.endAt) >= Date.now())
    ?.map((session) => session._id.toString());
  // Get all lead from this user
  const leads = await Lead.find({ "agent.id": id });

  // let leads = agentAndAdmittedLead.filter((leadItem) => {
  //   return leadItem?.agent?.id?.toString() === id;
  // });

  const allLeads = await filteringLeads(leads, "allLeads", runningSessions);
  const todaysLeads = await filteringLeads(leads, new Date(), runningSessions);
  const tomorrowLeads = await filteringLeads(
    leads,
    new Date().getTime() + 86400000,
    runningSessions
  );
  const allFollowUps = await getAllFollowUps(leads, runningSessions);

  // Get All agent Report
  // const agentsReport = await getAdmittedLeadAgentReport(
  //   agentAndAdmittedLead,
  //   runningSessions
  // );

  // Get Session Order Report
  const orderReport = await getAdmitionStatus();

  // console.log(agentsReport);
  res.status(200).json({
    message: "All Lead Getting success",
    data: {
      todaysLeads: todaysLeads,
      tomorrowLeads: tomorrowLeads,
      allLeads: {
        ...allLeads,
        expairedCall: [
          ...new Set([...allLeads.expairedCall, ...user?.expaired]),
        ],
      },
      allFollowUps: allFollowUps,
      orderReport,
    },
  });
});

const getAgentReports = AsyncHandler(async (req, res, next) => {
  const { sessionId: reportForSessions } = req.body.sessionId;

  let sessions;
  // Conditional Session reporting start here
  if (reportForSessions) {
    sessions = await Session.find({ _id: reportForSessions });
  } else {
    sessions = await Session.find();
  }
  // Conditional Session reporting End here
  const users = await User.find().select("_id firstName lastName expaired");

  // Running Sessions and Running Sessions leads
  let runningSessionLeads = [];
  let runningSessions;
  // Extracting Session Leads
  if (reportForSessions) {
    runningSessionLeads = [...sessions[0].leads];
    runningSessions = [
      {
        id: sessions[0]._id,
        startAt: sessions[0].startAt,
        endAt: sessions[0].endAt,
      },
    ];
  } else {
    runningSessions = sessions
      ?.filter((item) => new Date(item.endAt) >= Date.now())
      ?.map((session) => {
        runningSessionLeads.push.apply(runningSessionLeads, session.leads);
        return {
          id: session._id,
          startAt: session.startAt,
          endAt: session.endAt,
        };
      });
  }

  if (runningSessions === undefined || runningSessions.length === 0) {
    res.status(404);
    res.json({
      message: "It Seems no session is running currently",
    });
    return false;
  }

  // Reporting Leads
  const leads = await Lead.find({ _id: { $in: runningSessionLeads } }).select(
    "_id history agent admittedSession interest"
  );

  const report = getSessionReport(leads, users, runningSessions);
  // Sending response to Agent
  res.status(200).json({
    message: "report get success",
    data: report,
  });
});

module.exports = { getAgentDashBord, getAgentReports };
