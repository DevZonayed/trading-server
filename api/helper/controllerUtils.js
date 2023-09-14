const { runningSessions } = require("../controller/SessionController");
const { isDate, getPercentage } = require("./generalUtils");

function filteringLeads(leads, data = "global", runningSessions) {
  return new Promise((resolve, reject) => {
    try {
      let allLeads = leads.filter((item) => {
        if (data == "global" || data == "allLeads") {
          return true;
        }
        if (!isDate(data)) {
          return false;
        }
        return (
          new Date(item?.agent?.dateLine).toDateString("en", {}) ===
          new Date(data).toDateString("en", {})
        );
      });

      //   All calls that have done
      let allCompleteCall = allDoneLead(allLeads, runningSessions);

      //   All Calls Without done status
      let allOthersCalls = othersStatusLead(allLeads);

      // All Expaired
      let expairedCall = allExpairedCall(leads, runningSessions);

      resolve({
        completed: allCompleteCall.map((item) => item?._id),
        expairedCall: expairedCall.map((item) => item?._id),
        others: allOthersCalls.map((item) => item?._id),
        total: allLeads.map((item) => item._id),
      });
    } catch (err) {
      reject(err);
    }
  });
}

// All Lead with done status within assign
function allDoneLead(leads, runningSessions) {
  return leads.filter((item) => {
    let leadAdmitedSessions = item.admittedSession || [];
    let admittedRunningSessions = leadAdmitedSessions.filter((session) =>
      runningSessions?.includes(session.toString())
    );
    let history = item.history[item.history.length - 1];
    return (
      (new Date(history?.callAt) > new Date(item?.agent?.AssignAt) &&
        /^done$/i.test(history?.callStatus)) ||
      admittedRunningSessions.length !== 0
    );
  });
}
// This lead will help to find lead without done status
function othersStatusLead(leads) {
  return leads.filter((item) => {
    let history = item.history[item.history.length - 1];

    return (
      new Date(history?.callAt) > new Date(item?.agent?.AssignAt) &&
      !/^done$/i.test(history?.callStatus)
    );
  });
}
// Get All Expaired Call
function allExpairedCall(leads, runningSessions) {
  let lead = leads.filter((item) => {
    if (!isDate(item?.agent?.dateLine)) {
      return false;
    }

    let leadAdmitedSessions = item.admittedSession || [];

    let admittedRunningSessions = leadAdmitedSessions.filter((session) =>
      runningSessions?.includes(session.toString())
    );

    // Test Start

    // Test End
    return (
      new Date(
        new Date(item?.agent?.dateLine).toDateString("en", {
          dateStyle: "full",
        })
      ) < new Date(new Date().toDateString("en", { dateStyle: "full" })) &&
      admittedRunningSessions.length === 0 &&
      !isDate(item.followUpStatus.callAt) &&
      /^notapplicable$/i.test(callStatus(item))
    );
  });
  return lead;
}

// Get all followup calls
function getAllFollowUps(leads, runningSession) {
  return new Promise((resolve, reject) => {
    try {
      let followUps = leads.filter((item) => {
        let leadAdmitedSessions = item.admittedSession || [];
        let admittedRunningSessions = leadAdmitedSessions.filter((session) =>
          runningSession?.includes(session.toString())
        );

        return (
          (isDate(item?.followUpStatus?.callAt) ||
            item?.followUpStatus?.isCalled) &&
          admittedRunningSessions.length === 0
        );
      });

      resolve({
        allFollowUps: followUps.map((item) => {
          return { id: item?._id, followUpTime: item?.followUpStatus?.callAt };
        }),
        followUpDone: followUps
          .filter((item) => item?.followUpStatus?.isCalled)
          .map((item) => {
            return {
              id: item?._id,
              followUpTime: item?.followUpStatus?.callAt,
            };
          }),
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 *  Give a appropiate call status based on some condition
 * if any one input a lead from diffrent area after 5 days of assign someone then it will behave like fresh lead
 * @param {lead} lead
 * @returns
 */
function callStatus(lead) {
  let latestHistory = lead.history[lead.history.length - 1];
  if (latestHistory === undefined) {
    return "notapplicable";
  }
  if (
    new Date(lead?.agent?.AssignAt) >
      new Date(
        new Date(lead.leadStatus[lead.leadStatus.length - 1].leadAt).valueOf() -
          10 * 24 * 60 * 60 * 1000
      ) ||
    new Date(lead.leadStatus[lead.leadStatus.length - 1].leadAt) <
      new Date(latestHistory?.callAt)
  ) {
    return latestHistory.callStatus;
  }

  return "notapplicable";
}

/**
 * Is the value exsit in spacifiq object key
 * @param {all data} list
 * @param {key name} prop
 * @param {key value to match} val
 * @returns
 */
function objectPropInArray(list, prop, val) {
  if (list.length > 0) {
    for (i in list) {
      if (list[i][prop] === val) {
        return true;
      }
    }
  }
  return false;
}

/**
 *This mathod will remove duplicate and it will give priyority to processing then pending then cancled
 * @param {Orders} data
 * @returns
 */
const getNoDuplicateOrders = (data) => {
  let finalData = [];
  data.map((entry) => {
    let indexOfExist = finalData.findIndex((val) => {
      return (
        val?.billing?.email === entry.billing.email ||
        val?.billing?.phone === entry.billing.phone
      );
    });
    if (indexOfExist === -1) {
      finalData.push(entry);
    } else {
      if (finalData[indexOfExist].status !== "processing") {
        if (
          finalData[indexOfExist].status !== entry.status &&
          entry.status === "pending"
        ) {
          finalData[indexOfExist] = entry;
        }
      }
    }
  });
  return finalData;
};

/**
 * This function will return Admitted Scrore and agent score
 */

const getAdmittedLeadAgentReport = (data, runningSessions) => {
  return new Promise((resolve, reject) => {
    try {
      let report = [];
      data.forEach((lead) => {
        let runningSessionAdmition = lead?.admittedSession.filter((session) =>
          runningSessions?.includes(session?.toString())
        );
        if (runningSessionAdmition.length !== 0) {
          let prevIndex = report.findIndex((item) => {
            return (
              item?.id?.toString() === (lead?.agent?.id?.toString() || "self")
            );
            // return false;
          });

          if (prevIndex === -1) {
            report.push({
              name: lead.agent.name || "self",
              id: lead?.agent?.id?.toString() || "self",
              admittedCount: 1,
            });
          } else {
            report[prevIndex] = {
              ...report[prevIndex],
              admittedCount: report[prevIndex]?.admittedCount + 1,
            };
          }
        }
      });
      resolve(report);
    } catch (err) {
      resolve(err);
      // reject(err);
    }
  });
};

/**
const getSessionReport = (leads, users, runningSessions) => {
  return new Promise((resolve, reject) => {
    try {
      let runningSessionIds = runningSessions.map((item) => item._id);

      let reports = users.map((user) => {
        let leadHasHistoryForThisUser = leads.filter((lead) => {
          let historyIds = lead?.history.map((singleHistory) =>
            singleHistory?.agent?.id.toString()
          );
          if (historyIds.includes(user._id.toString())) {
            return lead;
          }
        });
        

        return {
          name: `${user.firstName && user.firstName} ${
            user.lastName && user.lastName
          }`,
          sessions: runningSessionIds,
          leads: leadHasHistoryForThisUser,
        };
      });
      resolve(reports);
    } catch (err) {
      reject(err);
    }
  });
};

*/
const getSessionReport = (leads, users, runningSessions) => {
  let runningSessionIds = runningSessions.map((item) => item?.id?.toString());

  // Find a running session witch is start first
  let sessionStart = getMinFromArr(
    runningSessions.map((item) => new Date(item?.startAt).valueOf())
  );
  // Find a running session witch will end last
  let sessionEnd = getMaxFromArr(
    runningSessions.map((item) => new Date(item?.endAt).valueOf())
  );
  // Report gonna store here
  let report = {};
  leads.map((data) => {
    // Extracting from history

    data?.history.map((item) => {
      // Check History for exact session
      if (
        new Date(item?.callAt).valueOf() > sessionStart &&
        new Date(item?.callAt).valueOf() < sessionEnd
      ) {
        // Check if this already exist in report or not
        if (!report[item.agent.id]) {
          report[item.agent.id] = {
            ...report[item.agent.id],
            name: item.agent.name,
            id: item.agent.id,
            admitted:
              sessionStart < item?.callAt > sessionEnd
                ? [data._id.toString()]
                : [],
            prediction:
              getMaxFromArr(data?.interest?.map((item) => item.progress)) >= 0.8
                ? [data._id.toString()]
                : [],
            total: [data._id.toString()],
          };
        } else {
          report[item.agent.id] = {
            ...report[item.agent.id],
            admitted: data.admittedSession
              ?.map((a) => a.toString())
              .includes.apply(
                data.admittedSession?.map((a) => a.toString()),
                runningSessionIds
              )
              ? [
                  ...new Set([
                    ...report[item.agent.id].admitted,
                    data._id.toString(),
                  ]),
                ]
              : report[item.agent.id].admitted,
            prediction:
              getMaxFromArr(data?.interest?.map((item) => item.progress)) >= 0.8
                ? [
                    ...new Set([
                      ...report[item.agent.id].prediction,
                      data._id.toString(),
                    ]),
                  ]
                : report[item.agent.id].prediction,
            total: [
              ...new Set([...report[item.agent.id].total, data._id.toString()]),
            ],
          };
        }
      }
    });

    // Extracting All Assigned Lead
    if (!report[data?.agent?.id]) {
      report[data?.agent?.id] = {
        ...report[data?.agent?.id],
        name: data.agent.name,
        id: data?.agent?.id,
        totalAssigned: [data._id.toString()],
      };
    } else {
      report[data?.agent?.id] = {
        ...report[data?.agent?.id],
        totalAssigned: report[data?.agent?.id]?.totalAssigned
          ? [...report[data?.agent?.id]?.totalAssigned, data._id.toString()]
          : [data._id.toString()],
      };
    }
  });

  return Object.values(report);
};
// Get Max Number from an array
function getMaxFromArr(arr) {
  let len = arr.length;
  let max = -Infinity;

  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
}

// Get Min number from an Array
function getMinFromArr(arr) {
  let len = arr.length;
  let min = Infinity;

  while (len--) {
    min = arr[len] < min ? arr[len] : min;
  }
  return min;
}

module.exports = {
  filteringLeads,
  allDoneLead,
  othersStatusLead,
  allExpairedCall,
  getAllFollowUps,
  objectPropInArray,
  getNoDuplicateOrders,
  getAdmittedLeadAgentReport,
  getSessionReport,
};
