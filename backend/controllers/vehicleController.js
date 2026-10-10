const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const Party = require("../models/Party");
const MonthlyHire = require("../models/MonthlyHire");
const Transport = require("../models/Transport");
const Sales = require("../models/Sales");
const Boulder = require("../models/Boulder");
const { scopedFilter, scopedIdFilter } = require("../utils/ownership");
const { cleanTripRates } = require("../utils/transportBasis");
const { todayDay, syncVehicleMonthlyHire, syncHireEntries, findActiveVehicleHire } = require("../utils/monthlyHire");

// Each monthly vehicle's running hire (monthlyHire), and its latest hire even when stopped (lastHire), for its dates
const attachMonthlyHires = async (userId, vehicles) => {
  const monthlyIds = vehicles.filter((vehicle) => vehicle.hireBasis === "per_month").map((vehicle) => vehicle._id);
  if (monthlyIds.length === 0) return vehicles.map((vehicle) => vehicle.toObject());

  const hires = await MonthlyHire.find({ userId, vehicleId: { $in: monthlyIds } })
    .select("vehicleId startDate endDate cancelledAt monthlyRate")
    .sort({ startDate: 1 });
  const today = new Date(todayDay());
  const running = new Map();
  const latest = new Map();
  for (const hire of hires) {
    const key = String(hire.vehicleId);
    const summary = { _id: hire._id, startDate: hire.startDate, endDate: hire.endDate, cancelledAt: hire.cancelledAt, monthlyRate: hire.monthlyRate };
    latest.set(key, summary);
    if (!hire.cancelledAt && (!hire.endDate || hire.endDate >= today)) running.set(key, summary);
  }

  return vehicles.map((vehicle) => ({
    ...vehicle.toObject(),
    monthlyHire: running.get(String(vehicle._id)) || null,
    lastHire: latest.get(String(vehicle._id)) || null,
  }));
};

// My own vehicle belongs to no party
const resolvePartyId = async (userId, partyId, ownership) => {
  if (!partyId || ownership === "own") {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(partyId)) {
    throw new Error("Invalid party id");
  }

  const party = await Party.findOne({ _id: partyId, userId }).select("_id");
  if (!party) {
    throw new Error("Party not found");
  }

  return party._id;
};

const createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      tripRates: cleanTripRates(req.body.tripRates),
      userId: req.userId,
      partyId: await resolvePartyId(req.userId, req.body.partyId, req.body.ownership),
    });
    await syncVehicleMonthlyHire(vehicle, req.body.monthlyFrom);
    const [saved] = await attachMonthlyHires(req.userId, [vehicle]);
    return res.status(201).json(saved);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to create vehicle",
      error: error.message,
    });
  }
};

const getAllVehicles = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const filter = scopedFilter(req, vehicleType ? { vehicleType } : {});
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
    return res.json(await attachMonthlyHires(req.userId, vehicles));
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch vehicles",
      error: error.message,
    });
  }
};

const getVehicleById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid vehicle id" });
  }

  try {
    const vehicle = await Vehicle.findOne(scopedIdFilter(req, id));

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    return res.json(vehicle);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch vehicle",
      error: error.message,
    });
  }
};

const editVehicle = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid vehicle id" });
  }

  try {
    const updatePayload = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(req.body, "tripRates")) {
      updatePayload.tripRates = cleanTripRates(req.body.tripRates);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "partyId") || req.body.ownership === "own") {
      updatePayload.partyId = await resolvePartyId(req.userId, req.body.partyId, req.body.ownership);
    }

    const before = await Vehicle.findOne(scopedIdFilter(req, id)).select("ownership hireBasis");
    const wasMonthly = before?.ownership === "hired" && before?.hireBasis === "per_month";

    const vehicle = await Vehicle.findOneAndUpdate(scopedIdFilter(req, id), updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Turning a vehicle monthly starts its rent; an edit to a monthly vehicle whose rent was cancelled leaves it stopped
    await syncVehicleMonthlyHire(vehicle, req.body.monthlyFrom, { startIfNone: !wasMonthly });
    const [saved] = await attachMonthlyHires(req.userId, [vehicle]);
    return res.json(saved);
  } catch (error) {
    return res.status(400).json({
      message: "Failed to update vehicle",
      error: error.message,
    });
  }
};

/**
 * Everything a vehicle has done: its monthly hires with their history and adjustments, every ledger entry for it
 * (monthly rent, trips for sales and boulder, manual entries), and the sale and boulder loads it carried.
 */
const getVehicleLedger = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid vehicle id" });
  }

  try {
    const vehicleDoc = await Vehicle.findOne(scopedIdFilter(req, id)).populate("partyId", "name type");
    if (!vehicleDoc) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const userId = vehicleDoc.userId;
    const byVehicle = { userId, $or: [{ vehicleId: vehicleDoc._id }, { vehicleNo: vehicleDoc.vehicleNo }] };
    const [[vehicle], hires, transports, sales, boulders] = await Promise.all([
      attachMonthlyHires(userId, [vehicleDoc]),
      MonthlyHire.find({ userId, vehicleId: vehicleDoc._id }).populate("partyId", "name").sort({ startDate: 1 }),
      Transport.find(byVehicle).populate("partyId", "name").sort({ entryDate: 1, createdAt: 1 }),
      Sales.find(byVehicle)
        .select("invoiceNumber saleDate createdAt partyId stoneSize pricingMode netWeight cubicMeterQty totalAmount transportMode")
        .populate("partyId", "name")
        .sort({ saleDate: 1 }),
      Boulder.find(byVehicle)
        .select("boulderNumber boulderDate createdAt partyName entryMode tripCount netWeight amount")
        .sort({ boulderDate: 1 }),
    ]);

    const partyName = (value) => (value && typeof value === "object" ? value.name || "" : "");

    return res.json({
      vehicle: { ...vehicle, ownerName: partyName(vehicleDoc.partyId) },
      hires: hires.map((hire) => {
        const months = transports.filter((entry) => String(entry.hireId) === String(hire._id));
        return {
          ...hire.toObject(),
          partyId: hire.partyId?._id || hire.partyId,
          partyName: partyName(hire.partyId),
          bookedMonths: months.length,
          bookedAmount: months.reduce((total, entry) => total + Number(entry.amount || 0), 0),
        };
      }),
      transports: transports.map((entry) => ({
        _id: entry._id,
        entryNumber: entry.entryNumber,
        entryDate: entry.entryDate,
        direction: entry.direction,
        source: entry.source,
        hireId: entry.hireId,
        partyName: partyName(entry.partyId),
        basis: entry.basis,
        quantity: entry.quantity,
        rate: entry.rate,
        amount: entry.amount,
        location: entry.location,
        fromDate: entry.fromDate,
        toDate: entry.toDate,
        notes: entry.notes,
      })),
      sales: sales.map((sale) => ({
        _id: sale._id,
        invoiceNumber: sale.invoiceNumber,
        date: sale.saleDate || sale.createdAt,
        partyName: partyName(sale.partyId),
        material: sale.stoneSize,
        pricingMode: sale.pricingMode,
        netWeight: sale.netWeight,
        cubicMeterQty: sale.cubicMeterQty,
        totalAmount: sale.totalAmount,
      })),
      boulders: boulders.map((boulder) => ({
        _id: boulder._id,
        boulderNumber: boulder.boulderNumber,
        date: boulder.boulderDate || boulder.createdAt,
        partyName: boulder.partyName,
        entryMode: boulder.entryMode,
        tripCount: boulder.tripCount,
        netWeight: boulder.netWeight,
        amount: boulder.amount,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load vehicle ledger", error: error.message });
  }
};

const deleteVehicle = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid vehicle id" });
  }

  try {
    const vehicle = await Vehicle.findOneAndDelete(scopedIdFilter(req, id));

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // A vehicle that goes stops its monthly hire today; the months it already booked stay in the ledger
    const activeHire = await findActiveVehicleHire(vehicle.userId, vehicle._id);
    if (activeHire) {
      const today = new Date(todayDay());
      activeHire.cancelledAt = today < activeHire.startDate ? activeHire.startDate : today;
      activeHire.cancelCharge = "prorata";
      activeHire.history.push({ at: new Date(), action: "Cancelled", note: "Vehicle deleted; days used charged" });
      await activeHire.save();
      await syncHireEntries(activeHire);
    }

    return res.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete vehicle",
      error: error.message,
    });
  }
};

module.exports = {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  getVehicleLedger,
  editVehicle,
  deleteVehicle,
};
