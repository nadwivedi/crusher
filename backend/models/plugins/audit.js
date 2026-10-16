const mongoose = require("mongoose");
const { getActor } = require("../../utils/requestContext");

// Records who added an entry and who last changed it: the owner, a staff login or the admin.
// The person comes from the request, so controllers do not have to pass it in.
const actorSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["owner", "staff", "admin"] },
    id: { type: String, default: "" },
    name: { type: String, default: "" },
  },
  { _id: false }
);

const stamp = (actor) => ({ kind: actor.kind, id: actor.id, name: actor.name, at: new Date() });

module.exports = function auditPlugin(schema) {
  schema.add({
    createdBy: { type: actorSchema, default: undefined },
    updatedBy: { type: actorSchema, default: undefined },
    updatedByAt: { type: Date, default: undefined },
  });

  schema.pre("save", function setAuditOnSave() {
    const actor = getActor();
    if (!actor) return;
    const { at, ...person } = stamp(actor);
    if (this.isNew) {
      if (!this.createdBy?.kind) this.createdBy = person;
    } else if (this.isModified()) {
      this.updatedBy = person;
      this.updatedByAt = at;
    }
  });

  schema.pre("insertMany", function setAuditOnInsertMany(docs) {
    const actor = getActor();
    if (!actor || !Array.isArray(docs)) return;
    const { at, ...person } = stamp(actor);
    docs.forEach((doc) => {
      if (doc && !doc.createdBy?.kind) doc.createdBy = person;
    });
  });

  // Edits made with findOneAndUpdate / updateOne mark who changed the entry
  schema.pre(["findOneAndUpdate", "updateOne"], function setAuditOnUpdate() {
    const actor = getActor();
    if (!actor) return;
    const update = this.getUpdate() || {};
    // Only real edits, not internal counters ($inc) or array pushes alone
    const changesFields = Object.keys(update).some((key) => !key.startsWith("$")) || Boolean(update.$set);
    if (!changesFields) return;
    const { at, ...person } = stamp(actor);
    this.set({ updatedBy: person, updatedByAt: at });
  });
};
