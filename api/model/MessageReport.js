const mongoose = require("mongoose");
var uniqueValidator = require("mongoose-unique-validator");

const MessageReportSchema = mongoose.Schema(
  {
    type: {
      type: String,
    },
    success: {
      type: Number,
    },
    unsuccess: {
      type: Number,
    },
    report: {
      type: Array,
    },
  },
  {
    timestamps: true,
  }
);

MessageReportSchema.plugin(uniqueValidator, {
  message: "{PATH} already exist",
});
const MessageReport = mongoose.model("MessageReport", MessageReportSchema);
module.exports = MessageReport;
