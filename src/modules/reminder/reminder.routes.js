const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authmiddleware");
const reminderController = require("./reminder.controller");

router.get(
  "/reminders",
  authMiddleware,
  reminderController.getAllReminders
);

router.get(
  "/vehicles/:vehicleId/reminders",
  authMiddleware,
  reminderController.getRemindersByVehicle
);

router.post(
  "/vehicles/:vehicleId/reminders",
  authMiddleware,
  reminderController.createReminder
);

router.put(
  "/reminders/:reminderId",
  authMiddleware,
  reminderController.updateReminder
);

router.delete(
  "/reminders/:reminderId",
  authMiddleware,
  reminderController.deleteReminder
);

module.exports = router;