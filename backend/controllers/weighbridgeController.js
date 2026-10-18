const mongoose = require("mongoose");
const Counter = require("../models/Counter");
const Vehicle = require("../models/Vehicle");
const Weighment = require("../models/Weighment");
const WeighbridgeDevice = require("../models/WeighbridgeDevice");
const { actorFromRequest } = require("../utils/requestContext");
const {
  getLatestReading,
  isFresh,
  publishReading,
  publishTickets,
  subscribe,
  hashWeighment,
} = require("../utils/weighbridge");

const DIRECTIONS = ["sale", "boulder", "other"];
const STATUSES = ["open", "closed", "used", "cancelled"];
// A truck back on the bridge sooner than this was probably not loaded or emptied
const SHORT_STAY_MS = 60 * 1000;
const MAX_WEIGHT_KG = 200000;
const LAST_SEEN_WRITE_GAP_MS = 30 * 1000;

const DEVICE_FIELDS = [
  "name", "baudRate", "dataBits", "parity", "stopBits", "profile", "unit", "multiplier", "customRegex",
  "stableMs", "toleranceKg", "minWeightKg", "tareAlertKg",
];

const normalizeVehicleNo = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
const roundKg = (value) => Math.round(Number(value) * 100) / 100;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const pickDeviceFields = (body = {}) => {
  const next = {};
  DEVICE_FIELDS.forEach((field) => {
    if (body[field] === undefined) return;
    next[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
  });
  if (next.customRegex !== undefined) {
    try {
      // eslint-disable-next-line no-new
      new RegExp(next.customRegex);
    } catch {
      throw new Error("The custom pattern is not a valid regular expression");
    }
  }
  return next;
};

const findDevice = (req, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return WeighbridgeDevice.findOne({ _id: id, userId: req.userId, active: true });
};

const nextRstNo = async (userId) => {
  const counter = await Counter.findOneAndUpdate(
    { userId, key: "weighment-rst" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.seq;
};

// ---------- Devices ----------

const listDevices = async (req, res) => {
  try {
    let devices = await WeighbridgeDevice.find({ userId: req.userId, active: true }).sort({ createdAt: 1 }).lean();
    // The owner's first visit sets up one kanta with the usual settings
    if (!devices.length && !req.employee) {
      const created = await WeighbridgeDevice.create({ userId: req.userId, name: "Kanta 1" });
      devices = [created.toObject()];
    }
    const data = devices.map((device) => ({ ...device, live: getLatestReading(device._id) }));
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load weighbridges");
  }
};

const createDevice = async (req, res) => {
  try {
    const fields = pickDeviceFields(req.body);
    const count = await WeighbridgeDevice.countDocuments({ userId: req.userId, active: true });
    const device = await WeighbridgeDevice.create({ name: `Kanta ${count + 1}`, ...fields, userId: req.userId });
    return res.status(201).json({ success: true, data: device });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to add weighbridge");
  }
};

const updateDevice = async (req, res) => {
  try {
    const device = await findDevice(req, req.params.id);
    if (!device) return fail(res, 404, "Weighbridge not found");
    Object.assign(device, pickDeviceFields(req.body));
    await device.save();
    return res.json({ success: true, data: device });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to save weighbridge settings");
  }
};

const removeDevice = async (req, res) => {
  try {
    const device = await findDevice(req, req.params.id);
    if (!device) return fail(res, 404, "Weighbridge not found");
    const openCount = await Weighment.countDocuments({ userId: req.userId, deviceId: device._id, status: "open" });
    if (openCount) return fail(res, 400, `${openCount} ticket(s) on this kanta still wait for a second weight`);
    device.active = false;
    await device.save();
    return res.json({ success: true, message: "Weighbridge removed" });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to remove weighbridge");
  }
};

// ---------- Live readings ----------

// deviceId -> userId, so readings arriving a few times a second do not each hit the database
const deviceOwner = new Map();
const lastSeenWrite = new Map();

const postReading = async (req, res) => {
  try {
    const { deviceId } = req.body || {};
    const key = String(deviceId || "");
    if (deviceOwner.get(key) !== String(req.userId)) {
      const device = await findDevice(req, key);
      if (!device) return fail(res, 404, "Weighbridge not found");
      deviceOwner.set(key, String(req.userId));
    }

    const overload = Boolean(req.body.overload);
    const weightKg = overload ? null : Number(req.body.weightKg);
    if (!overload && (!Number.isFinite(weightKg) || Math.abs(weightKg) > MAX_WEIGHT_KG)) {
      return fail(res, 400, "Invalid weight");
    }

    const reading = {
      weightKg: overload ? null : roundKg(weightKg),
      stable: !overload && Boolean(req.body.stable),
      overload,
      // Server time, so a slow or wrong cabin clock cannot make an old reading look fresh
      at: Date.now(),
      by: req.employee ? req.employee.name : "Owner",
    };
    publishReading(key, reading);

    if (reading.at - (lastSeenWrite.get(key) || 0) >= LAST_SEEN_WRITE_GAP_MS) {
      lastSeenWrite.set(key, reading.at);
      WeighbridgeDevice.updateOne(
        { _id: key },
        { $set: { lastSeenAt: new Date(reading.at), lastReading: { weightKg: reading.weightKg, stable: reading.stable, at: new Date(reading.at) } } }
      ).catch(() => lastSeenWrite.delete(key));
    }
    return res.json({ success: true });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to save reading");
  }
};

// Server-Sent Events: the live weight and ticket changes, pushed to any screen
const streamLive = async (req, res) => {
  const device = await findDevice(req, req.query.deviceId).catch(() => null);
  if (!device) return fail(res, 404, "Weighbridge not found");

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // nginx must pass events through straight away
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write("retry: 3000\n\n");

  const unsubscribe = subscribe(device._id, res);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 20000);
  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
  return undefined;
};

// ---------- Tickets ----------

// The weight for a capture: the device's last stable reading, or a typed weight from the owner
const resolveCapture = (req, device, body = {}) => {
  const by = actorFromRequest(req);
  const typed = body.manualWeightKg;
  if (typed !== undefined && typed !== null && typed !== "") {
    if (req.employee) return { error: "Only the owner can type a weight by hand" };
    const weightKg = Number(typed);
    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > MAX_WEIGHT_KG) return { error: "Enter a valid weight in kg" };
    const reason = String(body.reason || "").trim();
    if (!reason) return { error: "Write why the weight is typed by hand" };
    return { capture: { weightKg: roundKg(weightKg), at: new Date(), source: "manual", by, reason } };
  }

  const reading = getLatestReading(device._id);
  if (!isFresh(reading)) return { error: "No live weight from the kanta. Open the Weighbridge page on the kanta computer and connect the indicator." };
  if (reading.overload) return { error: "The indicator shows overload" };
  if (!reading.stable) return { error: "The weight is not stable yet" };
  if (reading.weightKg < Number(device.minWeightKg || 0)) return { error: `Weight is below ${device.minWeightKg} kg: is a vehicle on the bridge?` };
  return { capture: { weightKg: reading.weightKg, at: new Date(), source: "device", readingAt: new Date(reading.at), by } };
};

// Works out gross / tare / net, raises flags, remembers the tare and adds the ticket to the hash chain
const closeWeighment = async (weighment, device) => {
  const { first, second } = weighment;
  weighment.grossKg = roundKg(Math.max(first.weightKg, second.weightKg));
  weighment.tareKg = roundKg(Math.min(first.weightKg, second.weightKg));
  weighment.netKg = roundKg(weighment.grossKg - weighment.tareKg);
  weighment.status = "closed";
  weighment.closedAt = new Date();

  const flags = new Set(weighment.flags || []);
  if (first.source === "manual" || second.source === "manual") flags.add("manual");
  if (second.source === "stored") flags.add("stored_tare");
  if (first.source === "device" && second.source === "device" && new Date(second.at) - new Date(first.at) < SHORT_STAY_MS) {
    flags.add("short_stay");
  }

  let tareWarning = "";
  // The vehicle may have been added to the masters after the first weighing
  const vehicle = weighment.vehicleId
    ? await Vehicle.findOne({ _id: weighment.vehicleId, userId: weighment.userId })
    : await Vehicle.findOne({ userId: weighment.userId, vehicleNo: weighment.vehicleNo });
  if (vehicle) {
    weighment.vehicleId = vehicle._id;
    const tareFromDevice = (first.weightKg <= second.weightKg ? first : second).source === "device";
    const lastTare = Number(vehicle.lastTareKg || 0);
    if (tareFromDevice) {
      if (lastTare > 0 && Math.abs(weighment.tareKg - lastTare) > Number(device?.tareAlertKg ?? 300)) {
        flags.add("tare_mismatch");
        tareWarning = `Tare ${weighment.tareKg} kg differs from this vehicle's last tare ${lastTare} kg`;
      }
      vehicle.lastTareKg = weighment.tareKg;
      vehicle.lastTareAt = weighment.closedAt;
      await vehicle.save();
    }
  }
  weighment.flags = [...flags];

  const previous = await Weighment.findOne({ userId: weighment.userId, hash: { $ne: "" }, _id: { $ne: weighment._id } })
    .sort({ closedAt: -1 })
    .select("hash")
    .lean();
  weighment.prevHash = previous?.hash || "";
  weighment.hash = hashWeighment(weighment, weighment.prevHash);
  await weighment.save();
  return tareWarning;
};

const createWeighment = async (req, res) => {
  try {
    const { deviceId, useStoredTare } = req.body || {};
    const vehicleNo = normalizeVehicleNo(req.body?.vehicleNo);
    const direction = DIRECTIONS.includes(req.body?.direction) ? req.body.direction : "sale";
    if (!vehicleNo) return fail(res, 400, "Enter the vehicle number");

    const device = await findDevice(req, deviceId);
    if (!device) return fail(res, 404, "Weighbridge not found");

    const alreadyOpen = await Weighment.findOne({ userId: req.userId, vehicleNo, status: "open" }).select("rstNo").lean();
    if (alreadyOpen) return fail(res, 409, `${vehicleNo} already has open ticket RST ${alreadyOpen.rstNo}. Capture its second weight.`);

    const { capture, error } = resolveCapture(req, device, req.body);
    if (error) return fail(res, 400, error);

    const vehicle = await Vehicle.findOne({ userId: req.userId, vehicleNo }).select("_id lastTareKg").lean();
    if (useStoredTare && !(Number(vehicle?.lastTareKg) > 0)) {
      return fail(res, 400, "This vehicle has no saved tare yet. Weigh it empty once.");
    }
    if (useStoredTare && capture.weightKg <= Number(vehicle.lastTareKg)) {
      return fail(res, 400, "The weight on the bridge is not more than the saved tare: is the vehicle loaded?");
    }

    const weighment = new Weighment({
      userId: req.userId,
      deviceId: device._id,
      rstNo: await nextRstNo(req.userId),
      vehicleNo,
      vehicleId: vehicle?._id || null,
      direction,
      first: capture,
      note: String(req.body?.note || "").trim().slice(0, 200),
    });

    let tareWarning = "";
    if (useStoredTare) {
      weighment.second = { weightKg: Number(vehicle.lastTareKg), at: new Date(), source: "stored", by: capture.by };
      tareWarning = await closeWeighment(weighment, device);
    } else {
      if (capture.source === "manual") weighment.flags = ["manual"];
      await weighment.save();
    }

    publishTickets(device._id);
    return res.status(201).json({ success: true, data: weighment, warning: tareWarning });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to save the weight");
  }
};

const captureSecond = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 400, "Invalid ticket");
    const weighment = await Weighment.findOne({ _id: req.params.id, userId: req.userId });
    if (!weighment) return fail(res, 404, "Ticket not found");
    if (weighment.status !== "open") return fail(res, 400, `RST ${weighment.rstNo} already has both weights`);

    const device = await findDevice(req, req.body?.deviceId || weighment.deviceId);
    if (!device) return fail(res, 404, "Weighbridge not found");

    const { capture, error } = resolveCapture(req, device, req.body);
    if (error) return fail(res, 400, error);

    weighment.second = capture;
    const tareWarning = await closeWeighment(weighment, device);
    publishTickets(device._id);
    if (String(device._id) !== String(weighment.deviceId)) publishTickets(weighment.deviceId);
    return res.json({ success: true, data: weighment, warning: tareWarning });
  } catch (error) {
    return fail(res, 400, error.message || "Failed to save the second weight");
  }
};

const cancelWeighment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 400, "Invalid ticket");
    const weighment = await Weighment.findOne({ _id: req.params.id, userId: req.userId });
    if (!weighment) return fail(res, 404, "Ticket not found");
    if (weighment.status === "used") return fail(res, 400, "This ticket is used by an entry. Delete the entry first.");
    if (weighment.status === "cancelled") return res.json({ success: true, data: weighment });
    if (req.employee) {
      const ownTicket = weighment.createdBy?.kind === "staff" && weighment.createdBy?.id === String(req.employee._id);
      if (!ownTicket || weighment.status !== "open") return fail(res, 403, "Only the owner can cancel this ticket");
    }
    weighment.status = "cancelled";
    weighment.cancelReason = String(req.body?.reason || "").trim().slice(0, 200);
    await weighment.save();
    if (weighment.deviceId) publishTickets(weighment.deviceId);
    return res.json({ success: true, data: weighment });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to cancel the ticket");
  }
};

const listWeighments = async (req, res) => {
  try {
    const query = { userId: req.userId };
    const status = String(req.query.status || "");
    if (STATUSES.includes(status)) query.status = status;
    else if (status === "ready") query.status = "closed";
    const vehicle = normalizeVehicleNo(req.query.vehicleNo);
    if (vehicle) query.vehicleNo = { $regex: vehicle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    if (req.query.from) {
      const from = new Date(req.query.from);
      if (!Number.isNaN(from.getTime())) query.createdAt = { $gte: from };
    }
    // Staff never see tickets older than their visible days
    if (req.visibilityBoundary && !(query.createdAt?.$gte > req.visibilityBoundary)) {
      query.createdAt = { $gte: req.visibilityBoundary };
    }
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const data = await Weighment.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load tickets");
  }
};

const getWeighment = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 400, "Invalid ticket");
    const weighment = await Weighment.findOne({ _id: req.params.id, userId: req.userId }).lean();
    if (!weighment) return fail(res, 404, "Ticket not found");
    return res.json({ success: true, data: weighment });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load the ticket");
  }
};

// Vehicles with a saved tare, for single weighing
const getVehicleTare = async (req, res) => {
  try {
    const vehicleNo = normalizeVehicleNo(req.query.vehicleNo);
    if (!vehicleNo) return res.json({ success: true, data: null });
    const vehicle = await Vehicle.findOne({ userId: req.userId, vehicleNo }).select("vehicleNo lastTareKg lastTareAt unladenWeight").lean();
    return res.json({ success: true, data: vehicle || null });
  } catch (error) {
    return fail(res, 500, error.message || "Failed to load the vehicle");
  }
};

module.exports = {
  listDevices,
  createDevice,
  updateDevice,
  removeDevice,
  postReading,
  streamLive,
  createWeighment,
  captureSecond,
  cancelWeighment,
  listWeighments,
  getWeighment,
  getVehicleTare,
};
