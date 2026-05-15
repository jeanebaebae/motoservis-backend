const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authmiddleware");
const vehicleController = require("./vehicle.controller");

router.get("/", authMiddleware, vehicleController.getVehicles);
router.post("/", authMiddleware, vehicleController.createVehicle);
router.put("/:id", authMiddleware, vehicleController.updateVehicle);
router.delete("/:id", authMiddleware, vehicleController.deleteVehicle);
router.get("/:id/detail", authMiddleware, vehicleController.getVehicleDetail);
router.patch("/:id/odometer", authMiddleware, vehicleController.updateOdometer);

module.exports = router;