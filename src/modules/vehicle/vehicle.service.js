const pool = require("../../config/db");
const notificationService = require("../notification/notification.service");

const getVehicles = async (userId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM vehicles
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

const createVehicle = async (userId, data) => {
  const result = await pool.query(
    `
    INSERT INTO vehicles
      (user_id, name, brand, year, plate_number, current_odometer)
    VALUES
      ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      userId,
      data.name,
      data.brand,
      data.year,
      data.plate_number,
      data.current_odometer || 0,
    ]
  );

  return result.rows[0];
};

const updateVehicle = async (userId, vehicleId, data) => {
  const result = await pool.query(
    `
    UPDATE vehicles
    SET
      name = $1,
      brand = $2,
      year = $4,
      plate_number = $5,
      current_odometer = $6,
      updated_at = now()
    WHERE id = $7 AND user_id = $8
    RETURNING *
    `,
    [
      data.name,
      data.brand,
      data.year,
      data.plate_number,
      data.current_odometer,
      vehicleId,
      userId,
    ]
  );

  return result.rows[0];
};

const deleteVehicle = async (userId, vehicleId) => {
  await pool.query(
    `
    DELETE FROM vehicles
    WHERE id = $1 AND user_id = $2
    `,
    [vehicleId, userId]
  );
};

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getProgressPercentage = (currentOdometer, lastServiceKm, intervalKm) => {
  const progress =
    ((currentOdometer - lastServiceKm) / intervalKm) * 100;

  return Math.min(100, Math.max(0, Math.round(progress)));
};

const getReminderStatus = (remainingKm, notifyBeforeKm) => {
  if (remainingKm <= notifyBeforeKm) {
    return "Perlu Perhatian";
  }

  return "Aman";
};

const getVehicleDetail = async (userId, vehicleId) => {
  const vehicleResult = await pool.query(
    `
    SELECT *
    FROM vehicles
    WHERE id = $1 AND user_id = $2
    `,
    [vehicleId, userId]
  );

  if (vehicleResult.rows.length === 0) {
    throw createError("Kendaraan tidak ditemukan", 404);
  }

  const vehicle = vehicleResult.rows[0];

  const remindersResult = await pool.query(
    `
    SELECT *
    FROM service_reminders
    WHERE vehicle_id = $1
      AND is_active = true
    ORDER BY created_at DESC
    `,
    [vehicleId]
  );

  const reminders = remindersResult.rows.map((reminder) => {
    const remainingKm =
      reminder.next_service_km - vehicle.current_odometer;

    const status = getReminderStatus(
      remainingKm,
      reminder.notify_before_km
    );

    const progressPercentage = getProgressPercentage(
      vehicle.current_odometer,
      reminder.last_service_km,
      reminder.interval_km
    );

    return {
      ...reminder,
      remaining_km: remainingKm,
      status,
      progress_percentage: progressPercentage,
    };
  });

  const attentionCount = reminders.filter(
    (reminder) => reminder.status === "Perlu Perhatian"
  ).length;

  return {
    vehicle,
    reminder_summary: {
      total_active_reminders: reminders.length,
      attention_count: attentionCount,
    },
    reminders,
  };
};

const updateOdometer = async (userId, vehicleId, currentOdometer) => {
  const odometer = Number(currentOdometer);
  console.log("UPDATE ODOMETER CALLED");
  if (Number.isNaN(odometer) || odometer < 0) {
    const error = new Error("Odometer tidak valid");
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
    UPDATE vehicles
    SET current_odometer = $1,
        updated_at = now()
    WHERE id = $2
      AND user_id = $3
    RETURNING *
    `,
    [odometer, vehicleId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Vehicle not found");
    error.statusCode = 404;
    throw error;
  }

  console.log("BEFORE SEND NOTIFICATION");

  await notificationService.sendReminderNotificationsForVehicle(
    userId,
    vehicleId
  );

  console.log("AFTER SEND NOTIFICATION");

  return result.rows[0];
};


module.exports = {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleDetail,
  updateOdometer,
};