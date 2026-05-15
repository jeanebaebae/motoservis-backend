const serviceHistoryService = require("./serviceHistory.service");

const getHistoryByVehicle = async (req, res) => {
  try {
    const histories = await serviceHistoryService.getHistoryByVehicle(
      req.user.id,
      req.params.vehicleId
    );

    res.json({
      success: true,
      data: histories,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

const createServiceHistory = async (req, res) => {
  try {
    const history = await serviceHistoryService.createServiceHistory(
      req.user.id,
      req.params.vehicleId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: "Catatan servis berhasil disimpan",
      data: history,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getHistoryByVehicle,
  createServiceHistory,
};