const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authmiddleware");
const serviceHistoryController = require("./serviceHistory.controller");

router.get(
  "/vehicles/:vehicleId/history",
  authMiddleware,
  serviceHistoryController.getHistoryByVehicle
);

router.post(
  "/vehicles/:vehicleId/history",
  authMiddleware,
  serviceHistoryController.createServiceHistory
);

module.exports = router;