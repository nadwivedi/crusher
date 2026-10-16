const mongoose = require("mongoose");

// One row per change made from the admin panel (add / edit / delete / status change / access / login).
// Shown only in the hidden activity center of the admin panel.
const adminActivityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["create", "update", "delete", "activate", "deactivate", "access", "login"],
      required: true,
    },
    // What kind of record was touched
    entity: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    entityId: { type: String },
    // Name shown for the record, kept so it survives a delete
    entityName: { type: String, trim: true },
    summary: { type: String, required: true, trim: true },
    // Field-level changes for edits: { field: 'Name', from: 'Old', to: 'New' }
    changes: [
      {
        _id: false,
        field: String,
        from: mongoose.Schema.Types.Mixed,
        to: mongoose.Schema.Types.Mixed,
      },
    ],
    adminId: { type: String },
    adminEmail: { type: String },
    ip: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

adminActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.models.AdminActivityLog || mongoose.model("AdminActivityLog", adminActivityLogSchema);
