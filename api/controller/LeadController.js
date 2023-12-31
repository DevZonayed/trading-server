const AsyncHandler = require("express-async-handler");
const { isDate } = require("../helper/generalUtils");
const { formatNumToBd } = require("../helper/phoneNumberFormater");
const BulkEntry = require("../model/BulkEntry");
const Lead = require("../model/Lead");
const Session = require("../model/Session");
const Subject = require("../model/Subject");
const User = require("../model/User");
/**
 * @route "/api/v1/lead/bulkentry"
 * @desc "This Controler is for Lead Bulk Entry
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const handleBulkEntry = AsyncHandler(async (req, res, next) => {
  const { lead, session, subject, title } = req.body;
  let { _id, fullName } = req.tokenInfo;

  // Bulk Entry Title Validfation
  const entry = await BulkEntry.exists({ title });
  if (entry) {
    let error = new Error("Please give a unique Title !");
    res.status(409);
    next(error);
    return;
  }

  //   Create a entry Report
  const bulkEntry = new BulkEntry({
    title: title,
    session,
    subject,
    type: "MANUAL",
    createBy: {
      name: fullName,
      id: _id,
    },
  });

  //   Lead Operations handling start here
  let leadIDs = await Promise.all(
    lead.map(
      AsyncHandler(async (item) => {
        let modifyedLead = await Lead.findOneAndUpdate(
          {
            $or: [{ email: item.email }, { phone: formatNumToBd(item.phone) }],
          },
          {
            name: item.name,
            $addToSet: {
              phone: {
                $each: item.phone !== "" ? [formatNumToBd(item.phone)] : [],
              },
              email: { $each: item.email !== "" ? [item.email] : [] },
              entryType: {
                type: "General Bulk Lead",
                title: bulkEntry.title,
                id: bulkEntry._id,
              },
            },
          },
          { upsert: true, new: true }
        );

        // Update Bulk Edit
        if (
          new Date(modifyedLead.createdAt) >
          new Date(new Date(modifyedLead.updatedAt).valueOf() - 5000)
        ) {
          //   Add to fresh lead in entry report
          bulkEntry.freshLead = [
            ...new Set([...bulkEntry.freshLead, modifyedLead._id]),
          ];
        } else {
          //   Add to Previous lead in entry report
          bulkEntry.previousLead = [
            ...new Set([...bulkEntry.previousLead, modifyedLead._id]),
          ];
        }

        if (
          !modifyedLead?.leadStatus
            .map((item) => item?.session?.id.toString())
            .includes(session._id) ||
          !modifyedLead?.leadStatus
            .map((item) => item?.leadFrom)
            .includes(item.leadFrom)
        ) {
          await Lead.updateOne(
            {
              _id: modifyedLead._id,
            },
            {
              $addToSet: {
                leadStatus: {
                  leadFrom: item.leadFrom,
                  leadBy: {
                    name: item.leadBy || "Self",
                    id: null,
                  },
                  session: {
                    sessionNo: session.sessionNo,
                    id: session._id,
                  },
                  subject: {
                    title: subject.title,
                    id: subject._id,
                  },
                  leadAt:
                    new Date(item.leadAt).valueOf() < Date.now()
                      ? new Date(item.leadAt).valueOf()
                      : Date.now(),
                },
              },
            }
          );
        }

        return modifyedLead._id;
      })
    )
  );

  await bulkEntry.save();
  let sessionToUpdate = await Session.findById(session._id);
  await Session.updateOne(
    { _id: session._id },
    {
      leadCount: [...new Set([...sessionToUpdate.leads, ...leadIDs])].length,
      $addToSet: {
        leads: { $each: [...leadIDs] },
      },
    }
  );

  res.status(201).json({
    message: `${
      bulkEntry.freshLead.length + bulkEntry.previousLead.length
    } Bulk Entry Successfull`,
    data: bulkEntry,
  });
});

/**
 * @route "/api/v1/lead/bulkadmittedentry"
 * @desc "This Controler is for admitted Lead Bulk Entry
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const handleBulkAdmittedEntry = AsyncHandler(async (req, res, next) => {
  const { lead, session, subject, title, batchNo } = req.body;
  let { _id, fullName } = req.tokenInfo;

  // Bulk Entry Title Validfation
  const entry = await BulkEntry.exists({ title });
  if (entry) {
    let error = new Error("Please give a unique Title !");
    res.status(409);
    next(error);
    return;
  }

  //   Create a entry Report
  const bulkEntry = new BulkEntry({
    title: title,
    session,
    subject,
    type: "MANUAL",
    createBy: {
      name: fullName,
      id: _id,
    },
  });

  // Lead Operations handling start here
  let leadIDs = await Promise.all(
    lead.map(
      AsyncHandler(async (item) => {
        let modifyedLead = await Lead.findOneAndUpdate(
          {
            $or: [{ email: item.email }, { phone: formatNumToBd(item.phone) }],
          },
          {
            name: item.name,
            admitionStatus: {
              isAdmitted: true,
              admittedAt: Date.now(),
            },
            $addToSet: {
              admittedSession: session._id,
              phone: {
                $each: item.phone !== "" ? [formatNumToBd(item.phone)] : [],
              },
              email: { $each: item.email !== "" ? [item.email] : [] },
              entryType: {
                type: "Admitted bulk lead",
                title: bulkEntry.title,
                id: bulkEntry._id,
              },
            },
          },
          { upsert: true, new: true }
        );

        // Update Bulk Edit
        bulkEntry.admittedLead = [...bulkEntry.admittedLead, modifyedLead._id];
        if (
          new Date(modifyedLead.createdAt) >
          new Date(new Date(modifyedLead.updatedAt).valueOf() - 5000)
        ) {
          //   Add to fresh lead in entry report
          bulkEntry.freshLead = [...bulkEntry.freshLead, modifyedLead._id];
        } else {
          //   Add to Previous lead in entry report
          bulkEntry.previousLead = [
            ...bulkEntry.previousLead,
            modifyedLead._id,
          ];
        }

        // Batch Update at lead
        if (
          !modifyedLead?.batchStatus
            .map((item) => item?.sessionId?.toString())
            .includes(session._id) ||
          item.batch.split(",").filter((batch) => {
            return modifyedLead?.batchStatus.map(
              (item) => item?.batchNo === batch
            );
          }).length === 0
        ) {
          let batchStatusList = [];
          if (Array.isArray(modifyedLead.batchStatus)) {
            batchStatusList = [...modifyedLead.batchStatus];
          }
          item.batch.split(",").map((batchNo) => {
            batchStatusList.push({
              batchNo: batchNo,
              sessionId: session._id,
            });
          });
          await Lead.updateOne(
            {
              _id: modifyedLead._id,
            },
            {
              $addToSet: {
                batchStatus: {
                  $each: [...batchStatusList],
                },
              },
            }
          );
        }

        // Lead Status update
        if (
          !modifyedLead?.leadStatus
            .map((item) => item?.session?.id.toString())
            .includes(session._id) ||
          !modifyedLead?.leadStatus
            .map((item) => item?.leadFrom)
            .includes(item.leadFrom)
        ) {
          await Lead.updateOne(
            {
              _id: modifyedLead._id,
            },
            {
              $addToSet: {
                leadStatus: {
                  leadFrom: item.leadFrom,
                  leadBy: {
                    name: item.leadBy || "Self",
                  },
                  session: {
                    sessionNo: session.sessionNo,
                    id: session._id,
                  },
                  subject: {
                    title: subject.title,
                    id: subject._id,
                  },
                  leadAt:
                    new Date(item.leadAt).getTime() < Date.now()
                      ? new Date(item.leadAt).getTime()
                      : Date.now(),
                },
              },
            }
          );
        }

        modifyedLead.save();
        return modifyedLead._id;
      })
    )
  );

  await bulkEntry.save();
  let sessionToUpdate = await Session.findOne({ _id: session._id });
  await Session.updateOne(
    { _id: session._id },
    {
      leadCount: [...new Set([...sessionToUpdate?.leads, ...leadIDs])].length,
      $addToSet: {
        leads: { $each: [...leadIDs] },
        admittedLead: { $each: [...leadIDs] },
      },
    }
  );

  res.status(201).json({
    message: `${
      bulkEntry.freshLead.length + bulkEntry.previousLead.length
    } Admitted lead entry success`,
    data: bulkEntry,
  });
});

/**
 * @route "/api/v1/lead/getallbulkentry"
 * @desc "This Controler is for getting all bulk entry
 * @Access { Private }
 * @method "GET"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const getAllBulkEntryReport = AsyncHandler(async (req, res, next) => {
  let { pageNo, pageSize, type } = req.body;

  let bulkEntry;
  let manualCount = 0;
  let dynamiCount = 0;
  // Condition based on Type
  if (new RegExp("manual", "i").test(type)) {
    bulkEntry = await BulkEntry.find({ type: { $ne: "DYNAMIC" } })
      .sort({
        updatedAt: -1,
      })
      .limit(pageSize)
      .skip(pageNo * pageSize);

    // Menual Count
    manualCount = await BulkEntry.find({ type: { $ne: "DYNAMIC" } }).count();
  } else if (new RegExp("dynamic", "i").test(type)) {
    bulkEntry = await BulkEntry.find({ type: "DYNAMIC" })
      .sort({
        updatedAt: -1,
      })
      .limit(pageSize)
      .skip(pageNo * pageSize);

    // Count Items
    dynamiCount = await BulkEntry.find({ type: "DYNAMIC" }).count();
  }

  res.status(200).json({
    message: "All bulk entry report get successful !",
    data: bulkEntry,
    manualCount,
    dynamiCount,
  });
});

/**
 * @route "/api/v1/lead/getalllead"
 * @desc "This Controler is for getting all Leads
 * @Access { Private }
 * @method "GET"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const getAllLead = AsyncHandler(async (req, res, next) => {
  const leads = await Lead.find().sort({ updatedAt: -1 });
  res.status(200).json({
    message: "All lead getting successfull",
    data: leads,
  });
});

/**
 * @route "/api/v1/lead/updatelead"
 * @desc "This Controler is for getting all Leads
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const handleLeadUpdate = AsyncHandler(async (req, res, next) => {
  const { _id, data } = req.body;
  // Update Lead
  const updatedLead = await Lead.findByIdAndUpdate(
    _id,
    { ...data },
    {
      new: true,
    }
  );

  res.status(200).json({
    message: "Lead Update Successfull !",
    data: updatedLead,
  });
});

/**
 * @route "/api/v1/lead/getleadsbyid"
 * @desc "This Controler is for getting all Leads
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const getLeadByIds = AsyncHandler(async (req, res, next) => {
  const { data } = req.body;
  if (data.length === 0) {
    res.status(404);
    let error = new Error("Nothing Found !");
    next(error);
    return;
  }

  // Get All Leads
  const leads = await Lead.find({ _id: { $in: data } }).sort({ updatedAt: -1 });
  if (leads.length === 0) {
    res.status(404);
    let error = new Error("Nothing Found !");
    next(error);
    return;
  }

  res.status(200).json({
    message: "Lead Getting Successfull !",
    data: leads,
  });
});

/**
 * @route "/api/v1/lead/assignagent"
 * @desc "This Controler is for Assign Agent
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const assignAgenet = AsyncHandler(async (req, res, next) => {
  const { ids, dateLine, agent } = req.body;
  let { _id, fullName } = req.tokenInfo;

  let prevLeads = await Lead.find({ _id: { $in: ids } });

  // Sunning Sessions
  let runningSessions = [...(await Session.find().select("_id endAt"))]
    ?.filter((item) => new Date(item.endAt) >= Date.now())
    ?.map((session) => session._id.toString());

  prevLeads.map(
    AsyncHandler(async (item) => {
      if (item.agent.id === undefined || item.agent.id === agent._id) {
        return;
      }

      let leadAdmitedSessions = item.admittedSession || [];
      let admittedRunningSessions = leadAdmitedSessions.filter((session) =>
        runningSessions?.includes(session.toString())
      );

      if (
        (((new Date(item.history[item.history?.length - 1]?.callAt) <
          new Date(item.agent.AssignAt) ||
          (isDate(item.followUpStatus.callAt) &&
            item.followUpStatus?.agent?.id !== agent.id) ||
          item.history.length === 0) &&
          new Date(item?.agent?.dateLine) < new Date()) ||
          new Date(item?.followUpStatus?.callAt) < new Date()) &&
        admittedRunningSessions.length === 0
      ) {
        await User.updateOne(
          { _id: item.agent.id },
          {
            $addToSet: {
              expaired: item._id,
            },
          }
        );
      }
    })
  );

  await Lead.updateMany(
    { _id: { $in: ids } },
    {
      agent: {
        name: `${agent.firstName} ${agent.lastName}`,
        id: agent._id,
        assignBy: {
          name: fullName,
          id: _id,
        },
        AssignAt: Date.now(),
        dateLine: dateLine,
      },
    }
  );

  await User.updateOne(
    { _id: agent._id },
    {
      $addToSet: {
        leads: [...ids],
      },
      $push: {
        notification: {
          $each: [
            {
              title: "Assign Lead",
              description: `${ids.length} Lead assigned to you`,
              link: "/datagrid",
              showAfter: Date.now(),
              type: "leadAssigned",
            },
          ],
          $slice: -10,
        },
      },
    }
  );
  const updatedLeads = await Lead.find({ _id: { $in: ids } }).sort({
    updatedAt: -1,
  });
  res.status(200).json({
    message: `${ids.length} Lead Assign to ${agent.firstName} Successful`,
    data: updatedLeads,
  });
});

/**
 * @route "/api/v1/lead/getleadforagent"
 * @desc "This Controler is for Assign Agent
 * @Access { Private }
 * @method "POST"
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
const getLeadByAgent = AsyncHandler(async (req, res, next) => {
  const { user } = req.body;
  const leads = await Lead.find({ "agent.id": user._id }).sort({
    updatedAt: -1,
  });
  res.status(200).json({
    message: "All Lead Getting success",
    data: leads,
  });
});

module.exports = {
  handleBulkEntry,
  getAllBulkEntryReport,
  getAllLead,
  handleLeadUpdate,
  getLeadByIds,
  assignAgenet,
  getLeadByAgent,
  handleBulkAdmittedEntry,
};
