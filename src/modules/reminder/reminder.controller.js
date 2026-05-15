const reminderService = require("./reminder.service");

const getRemindersByVehicle = async (req, res) => {
  try {
    const reminders = await reminderService.getRemindersByVehicle(
      req.user.id,
      req.params.vehicleId
    );

    res.json({
      success: true,
      data: reminders,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

const createReminder = async (req, res) => {
  try {
    const reminder = await reminderService.createReminder(
      req.user.id,
      req.params.vehicleId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: "Reminder berhasil ditambahkan",
      data: reminder,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

const updateReminder = async (req, res) => {
  try {
    const reminder = await reminderService.updateReminder(
      req.user.id,
      req.params.reminderId,
      req.body
    );

    res.json({
      success: true,
      message: "Reminder berhasil diperbarui",
      data: reminder,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

const deleteReminder = async (req, res) => {
  try {
    await reminderService.deleteReminder(req.user.id, req.params.reminderId);

    res.json({
      success: true,
      message: "Reminder berhasil dihapus",
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

const getAllReminders = async (req, res) => {
  try {
    const reminders = await reminderService.getAllReminders(req.user.id);

    res.json({
      success: true,
      data: reminders,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getAllReminders,
  getRemindersByVehicle,
  createReminder,
  updateReminder,
  deleteReminder,
};