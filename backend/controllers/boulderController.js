const mongoose = require("mongoose");
const Boulder = require("../models/Boulder");
const Counter = require("../models/Counter");
const Party = require("../models/Party");
const Vehicle = require("../models/Vehicle");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");

const getCurrentTime = () => {
  const now = new Date();
  const hours = `${now.getHours()}`.padStart(2, "0");
  const minutes = `${now.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
};

const getBoulderYear = (boulderDateValue) => {
  const boulderDate = boulderDateValue ? new Date(boulderDateValue) : new Date();
  if (Number.isNaN(boulderDate.getTime())) {
    return new Date().getFullYear();
  }
  return boulderDate.getFullYear();
};

const createBoulderNumber = async (userId, boulderDateValue) => {
  const boulderYear = getBoulderYear(boulderDateValue);
  const counterKey = `boulders:${boulderYear}`;
  const counter = await Counter.findOneAndUpdate(
    { userId, key: counterKey },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return `BOL-${boulderYear}-${String(counter.seq).padStart(2, "0")}`;
};

const normalizeVehicleNo = (value) => `${value || ""}`.trim().toUpperCase();

const RATE_BASES = ["per_ton", "per_trip"];

const toSafeNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

// A per-ton rate goes on the net weight; a per-trip rate on the trips (one for a single entry)
const calculateRateAmount = (basis, rate, netWeight, trips) => {
  const quantity = basis === "per_trip" ? trips : toSafeNumber(netWeight) / 1000;
  return Math.max(0, Math.round(quantity * toSafeNumber(rate) * 100) / 100);
};

const resolveVehicleParty = async (payload, userId) => {
  if (payload.partyId && mongoose.Types.ObjectId.isValid(payload.partyId)) {
    const existingParty = await Party.findOne({ _id: payload.partyId, userId });
    if (existingParty) return existingParty._id;
  }

  const partyName = typeof payload.partyName === "string"
    ? payload.partyName.trim()
    : "";

  if (!partyName) {
    return null;
  }

  const existingParty = await Party.findOne({
    userId,
    name: { $regex: `^${partyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  });

  if (existingParty) {
    return existingParty._id;
  }

  const createdParty = await Party.create({
    userId,
    name: partyName,
    type: "customer",
  });

  return createdParty._id;
};

const resolvePartySnapshot = async ({ partyId, partyName, fallbackPartyId = null }, userId) => {
  const primaryPartyId = partyId && mongoose.Types.ObjectId.isValid(partyId) ? partyId : null;
  const fallbackId = fallbackPartyId && mongoose.Types.ObjectId.isValid(fallbackPartyId) ? fallbackPartyId : null;

  if (primaryPartyId) {
    const party = await Party.findOne({ _id: primaryPartyId, userId }).select("name");
    if (party?.name) {
      return { partyId: party._id, partyName: party.name };
    }
  }

  const trimmedPartyName = typeof partyName === "string" ? partyName.trim() : "";
  if (trimmedPartyName) {
    const matchedParty = await Party.findOne({
      userId,
      name: { $regex: `^${trimmedPartyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    }).select("name");

    if (matchedParty?.name) {
      return { partyId: matchedParty._id, partyName: matchedParty.name };
    }

    return { partyId: primaryPartyId || fallbackId || null, partyName: trimmedPartyName };
  }

  if (fallbackId) {
    const fallbackParty = await Party.findOne({ _id: fallbackId, userId }).select("name");
    if (fallbackParty?.name) {
      return { partyId: fallbackParty._id, partyName: fallbackParty.name };
    }
  }

  return { partyId: null, partyName: "" };
};

const NO_RATES = { boulderRatePerTon: 0, boulderRatePerTrip: 0, transportRate: 0, transportRateBasis: "per_ton", transportLocation: "" };

/**
 * The supplier's boulder and transport rates at the time of the entry.
 * Transport is added only for a transport provider paid per ton or per trip; a per-trip rate is the picked location's
 * (or the only location's). Per km and per month hire is booked from the Transport page instead.
 */
const resolveBoulderRateSnapshot = async (partyId, userId, transportLocation = "") => {
  if (!partyId || !mongoose.Types.ObjectId.isValid(partyId)) {
    return { ...NO_RATES };
  }

  const party = await Party.findOne({ _id: partyId, userId })
    .select("type isTransportProvider boulderRatePerTon boulderRatePerTrip hireBasis hireRate tripRates");
  if (!party || party.type !== "supplier") {
    return { ...NO_RATES };
  }

  const rates = {
    ...NO_RATES,
    boulderRatePerTon: Math.max(0, toSafeNumber(party.boulderRatePerTon)),
    boulderRatePerTrip: Math.max(0, toSafeNumber(party.boulderRatePerTrip)),
  };
  if (!party.isTransportProvider) return rates;

  if (party.hireBasis === "per_ton") {
    return { ...rates, transportRateBasis: "per_ton", transportRate: Math.max(0, toSafeNumber(party.hireRate)) };
  }

  if (party.hireBasis === "per_trip") {
    const tripRates = party.tripRates || [];
    const wanted = `${transportLocation || ""}`.trim().toLowerCase();
    const trip = tripRates.find((row) => row.location.toLowerCase() === wanted) || (tripRates.length === 1 ? tripRates[0] : null);
    if (trip) {
      return { ...rates, transportRateBasis: "per_trip", transportRate: Math.max(0, toSafeNumber(trip.rate)), transportLocation: trip.location };
    }
  }

  return rates;
};

const normalizeBoulderPayload = async (payload, userId) => {
  const normalizedPayload = { ...payload };
  const hasVehicleId =
    normalizedPayload.vehicleId !== undefined &&
    normalizedPayload.vehicleId !== null &&
    `${normalizedPayload.vehicleId}`.trim() !== "";
  const hasVehicleNo =
    typeof normalizedPayload.vehicleNo === "string" &&
    normalizedPayload.vehicleNo.trim() !== "";

  if (
    normalizedPayload.tareWeight === undefined &&
    normalizedPayload.vehicleWeight !== undefined
  ) {
    normalizedPayload.tareWeight = normalizedPayload.vehicleWeight;
  }

  if (
    normalizedPayload.grossWeight === undefined &&
    normalizedPayload.netWeight !== undefined &&
    (
      normalizedPayload.boulderWeight !== undefined ||
      normalizedPayload.vehicleWeight !== undefined
    )
  ) {
    normalizedPayload.grossWeight = normalizedPayload.netWeight;
  }

  if (
    normalizedPayload.netWeight === undefined &&
    normalizedPayload.boulderWeight !== undefined
  ) {
    normalizedPayload.netWeight = normalizedPayload.boulderWeight;
  }

  if (
    normalizedPayload.netWeight === undefined &&
    normalizedPayload.grossWeight !== undefined &&
    normalizedPayload.tareWeight !== undefined
  ) {
    normalizedPayload.netWeight =
      Number(normalizedPayload.grossWeight) - Number(normalizedPayload.tareWeight);
  }

  delete normalizedPayload.weight;
  delete normalizedPayload.vehicleWeight;
  delete normalizedPayload.boulderWeight;

  // Bulk entry: one record for a whole day of trips, total = trips x average weight per trip.
  if (normalizedPayload.entryMode === "bulk") {
    const tripCount = Math.floor(Number(normalizedPayload.tripCount));
    const averageWeight = Number(normalizedPayload.averageWeight);

    if (!Number.isFinite(tripCount) || tripCount < 1) {
      throw new Error("Number of trips must be at least 1");
    }

    if (!Number.isFinite(averageWeight) || averageWeight <= 0) {
      throw new Error("Average weight per trip must be greater than 0");
    }

    normalizedPayload.tripCount = tripCount;
    normalizedPayload.averageWeight = averageWeight;
    normalizedPayload.netWeight = tripCount * averageWeight;
    normalizedPayload.grossWeight = normalizedPayload.netWeight;
    normalizedPayload.tareWeight = 0;
  } else {
    normalizedPayload.entryMode = "single";
    normalizedPayload.tripCount = 0;
    normalizedPayload.averageWeight = 0;
  }

  if (normalizedPayload.boulderDate !== undefined) {
    normalizedPayload.boulderDate = new Date(normalizedPayload.boulderDate);
  }

  if (normalizedPayload.boulderTime !== undefined) {
    normalizedPayload.boulderTime = `${normalizedPayload.boulderTime}`.trim().slice(0, 5);
  }

  if (normalizedPayload.entryTime !== undefined) {
    normalizedPayload.entryTime = `${normalizedPayload.entryTime || ""}`.trim().slice(0, 5);
  }

  if (normalizedPayload.exitTime !== undefined) {
    normalizedPayload.exitTime = `${normalizedPayload.exitTime || ""}`.trim().slice(0, 5);
  }

  if (!normalizedPayload.boulderTime) {
    normalizedPayload.boulderTime = getCurrentTime();
  }

  let vehicle = null;

  if (hasVehicleId) {
    if (!mongoose.Types.ObjectId.isValid(normalizedPayload.vehicleId)) {
      throw new Error("Invalid vehicle id");
    }

    vehicle = await Vehicle.findOne({ _id: normalizedPayload.vehicleId, userId });

    if (!vehicle) {
      throw new Error("Vehicle not found");
    }
  } else if (hasVehicleNo) {
    const normalizedVehicleNo = normalizeVehicleNo(normalizedPayload.vehicleNo);
    vehicle = await Vehicle.findOne({
      userId,
      vehicleNo: normalizedVehicleNo,
    });

    if (!vehicle) {
      const resolvedPartyId = await resolveVehicleParty(normalizedPayload, userId);
      const tareWeight = Number(normalizedPayload.tareWeight);

      vehicle = await Vehicle.create({
        userId,
        partyId: resolvedPartyId,
        vehicleNo: normalizedVehicleNo,
        unladenWeight: Number.isFinite(tareWeight) && tareWeight >= 0 ? tareWeight : 0,
        vehicleType: "boulder",
      });
    }
  }

  if (vehicle) {
    normalizedPayload.vehicleId = vehicle._id;
    normalizedPayload.vehicleNo = vehicle.vehicleNo;
    const partySnapshot = await resolvePartySnapshot({
      partyId: normalizedPayload.partyId,
      partyName: normalizedPayload.partyName,
      fallbackPartyId: vehicle.partyId,
    }, userId);
    normalizedPayload.partyId = partySnapshot.partyId;
    normalizedPayload.partyName = partySnapshot.partyName;

    if (normalizedPayload.tareWeight === undefined) {
      normalizedPayload.tareWeight = vehicle.unladenWeight;
    }

    if (
      normalizedPayload.netWeight === undefined &&
      normalizedPayload.grossWeight !== undefined &&
      normalizedPayload.tareWeight !== undefined
    ) {
      normalizedPayload.netWeight =
        Number(normalizedPayload.grossWeight) - Number(normalizedPayload.tareWeight);
    }
  } else {
    const partySnapshot = await resolvePartySnapshot({
      partyId: normalizedPayload.partyId,
      partyName: normalizedPayload.partyName,
    }, userId);
    normalizedPayload.partyId = partySnapshot.partyId;
    normalizedPayload.partyName = partySnapshot.partyName;
  }

  const rates = await resolveBoulderRateSnapshot(normalizedPayload.partyId, userId, normalizedPayload.transportLocation);
  // The entry picks how the boulder is charged; without a choice it goes by whichever rate the supplier has
  const boulderRateBasis = RATE_BASES.includes(normalizedPayload.boulderRateBasis)
    ? normalizedPayload.boulderRateBasis
    : rates.boulderRatePerTon <= 0 && rates.boulderRatePerTrip > 0 ? "per_trip" : "per_ton";
  const trips = normalizedPayload.entryMode === "bulk" ? Math.max(0, Math.floor(toSafeNumber(normalizedPayload.tripCount))) : 1;
  const boulderAmount = calculateRateAmount(
    boulderRateBasis,
    boulderRateBasis === "per_trip" ? rates.boulderRatePerTrip : rates.boulderRatePerTon,
    normalizedPayload.netWeight,
    trips
  );
  const transportAmount = calculateRateAmount(rates.transportRateBasis, rates.transportRate, normalizedPayload.netWeight, trips);

  Object.assign(normalizedPayload, rates, {
    boulderRateBasis,
    boulderAmount,
    transportAmount,
    amount: Math.round((boulderAmount + transportAmount) * 100) / 100,
  });

  return normalizedPayload;
};

const createBoulder = async (req, res) => {
  try {
    const payload = await normalizeBoulderPayload(req.body, req.userId);
    payload.userId = req.userId;
    payload.boulderNumber = await createBoulderNumber(req.userId, payload.boulderDate);
    const boulder = await Boulder.create(payload);
    return res.status(201).json(boulder);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create boulder",
      error: error.message,
    });
  }
};

const getAllBoulders = async (req, res) => {
  try {
    const query = scopedFilter(req);
    if (req.visibilityBoundary) {
      query.boulderDate = { $gte: req.visibilityBoundary };
    }

    const boulders = await Boulder.find(query)
      .populate("vehicleId")
      .sort({ boulderDate: -1, createdAt: -1 });
    return res.json(boulders);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch boulders",
      error: error.message,
    });
  }
};

const getBoulderById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid boulder id" });
  }

  try {
    const query = scopedIdFilter(req, id);
    if (req.visibilityBoundary) {
      query.boulderDate = { $gte: req.visibilityBoundary };
    }

    const boulder = await Boulder.findOne(query).populate("vehicleId");

    if (!boulder) {
      return res.status(404).json({ message: "Boulder not found" });
    }

    return res.json(boulder);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch boulder",
      error: error.message,
    });
  }
};

const editBoulder = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid boulder id" });
  }

  try {
    const payload = await normalizeBoulderPayload(req.body, req.userId);
    const existingBoulder = await Boulder.findOne(scopedIdFilter(req, id)).select("boulderNumber userId");
    if (existingBoulder?.boulderNumber) {
      payload.boulderNumber = existingBoulder.boulderNumber;
    }
    payload.userId = existingBoulder.userId;

    const boulder = await Boulder.findOneAndUpdate(scopedIdFilter(req, id), payload, {
      new: true,
      runValidators: true,
    }).populate("vehicleId");

    if (!boulder) {
      return res.status(404).json({ message: "Boulder not found" });
    }

    return res.json(boulder);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update boulder",
      error: error.message,
    });
  }
};

const deleteBoulder = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid boulder id" });
  }

  try {
    const boulder = await Boulder.findOneAndDelete(scopedIdFilter(req, id));

    if (!boulder) {
      return res.status(404).json({ message: "Boulder not found" });
    }

    return res.json({ message: "Boulder deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete boulder",
      error: error.message,
    });
  }
};

module.exports = {
  createBoulder,
  getAllBoulders,
  getBoulderById,
  editBoulder,
  deleteBoulder,
};
