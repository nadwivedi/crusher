const { AsyncLocalStorage } = require("async_hooks");

// Who is making the current request, available to anything the request runs (such as model hooks)
// without passing it through every function.
const storage = new AsyncLocalStorage();

const runWithActor = (actor, callback) => storage.run({ actor }, callback);

const getActor = () => storage.getStore()?.actor || null;

// The person behind a request: the owner, one of their staff, or the CrusherBook admin using the account
const actorFromRequest = (req) => {
  if (req.employee) {
    return { kind: "staff", id: String(req.employee._id), name: req.employee.name || "Staff" };
  }
  if (req.adminAccess) {
    return { kind: "admin", id: String(req.adminId || ""), name: "CrusherBook Admin" };
  }
  return { kind: "owner", id: String(req.userId || ""), name: "Owner" };
};

module.exports = { runWithActor, getActor, actorFromRequest };
