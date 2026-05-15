const vehicleService = require("./vehicle.service");

const getVehicles = async (req, res) => {
  const vehicles = await vehicleService.getVehicles(req.user.id);

  res.json({
    success: true,
    data: vehicles,
  });
};

const createVehicle = async (req, res) => {
  const vehicle = await vehicleService.createVehicle(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: "Kendaraan berhasil ditambahkan",
    data: vehicle,
  });
};

const updateVehicle = async (req, res) => {
  const vehicle = await vehicleService.updateVehicle(
    req.user.id,
    req.params.id,
    req.body
  );

  res.json({
    success: true,
    message: "Kendaraan berhasil diperbarui",
    data: vehicle,
  });
};

const deleteVehicle = async (req, res) => {
  await vehicleService.deleteVehicle(req.user.id, req.params.id);

  res.json({
    success: true,
    message: "Kendaraan berhasil dihapus",
  });
};

const getVehicleDetail = async (req, res) => {
  try {
    const detail = await vehicleService.getVehicleDetail(
      req.user.id,
      req.params.id
    );

    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

const updateOdometer = async (req, res) => {
  try {
    const vehicle = await vehicleService.updateOdometer(
      req.user.id,
      req.params.id,
      req.body.current_odometer
    );

    res.json({
      success: true,
      message: "Odometer berhasil diperbarui",
      data: vehicle,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDetail,
  updateOdometer,
};