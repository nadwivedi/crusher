const mongoose = require("mongoose");

// How much of a day's pay each mark earns. Paid leave / holiday is paid as a full day.
const ATTENDANCE_WEIGHTS = { present: 1, half: 0.5, absent: 0, leave: 1 };

// One worker's mark for one day
const payrollAttendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollEmployee",
      required: true,
    },
    // The day as "YYYY-MM-DD" and its month as "YYYY-MM" (business days, free of time zones)
    dateKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    monthKey: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    status: {
      type: String,
      enum: Object.keys(ATTENDANCE_WEIGHTS),
      required: true,
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24,
    },
    // Pay for a full day and for an hour of overtime when this was marked, so a later change of salary
    // does not rewrite months already worked
    dayPay: {
      type: Number,
      default: 0,
      min: 0,
    },
    otRate: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

payrollAttendanceSchema.index({ userId: 1, employee: 1, dateKey: 1 }, { unique: true });
payrollAttendanceSchema.index({ userId: 1, monthKey: 1 });

payrollAttendanceSchema.plugin(require("./plugins/audit"));

const PayrollAttendance = mongoose.models.PayrollAttendance || mongoose.model("PayrollAttendance", payrollAttendanceSchema);
PayrollAttendance.ATTENDANCE_WEIGHTS = ATTENDANCE_WEIGHTS;

module.exports = PayrollAttendance;
