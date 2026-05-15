const pool = require("../../config/db");

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getVehicleByUser = async (userId, vehicleId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM vehicles
    WHERE id = $1 AND user_id = $2
    `,
    [vehicleId, userId]
  );

  if (result.rows.length === 0) {
    throw createError("Kendaraan tidak ditemukan", 404);
  }

  return result.rows[0];
};

const getReminderByUser = async (userId, vehicleId, reminderId) => {
  const result = await pool.query(
    `
    SELECT sr.*
    FROM service_reminders sr
    JOIN vehicles v ON v.id = sr.vehicle_id
    WHERE sr.id = $1
      AND sr.vehicle_id = $2
      AND v.user_id = $3
    `,
    [reminderId, vehicleId, userId]
  );

  if (result.rows.length === 0) {
    throw createError("Reminder tidak ditemukan", 404);
  }

  return result.rows[0];
};

const getHistoryByVehicle = async (userId, vehicleId) => {
  await getVehicleByUser(userId, vehicleId);

  const result = await pool.query(
    `
    SELECT *
    FROM service_history
    WHERE vehicle_id = $1
    ORDER BY service_date DESC, created_at DESC
    `,
    [vehicleId]
  );

  return result.rows;
};

const createServiceHistory = async (userId, vehicleId, data) => {
  const vehicle = await getVehicleByUser(userId, vehicleId);

  const {
    reminder_id,
    service_type,
    service_date,
    odometer_at_service,
    workshop_name,
    notes,
    cost,
  } = data;

  if (!service_type) {
    throw createError("Jenis servis wajib diisi");
  }

  if (!service_date) {
    throw createError("Tanggal servis wajib diisi");
  }

  const odometerAtService = Number(odometer_at_service);

  if (!odometerAtService || odometerAtService < 0) {
    throw createError("Odometer saat servis tidak valid");
  }

  if (odometerAtService > vehicle.current_odometer) {
    throw createError(
      "Odometer saat servis tidak boleh lebih besar dari odometer kendaraan saat ini"
    );
  }

  const serviceCost = cost ? Number(cost) : null;

  if (serviceCost !== null && serviceCost < 0) {
    throw createError("Biaya servis tidak boleh negatif");
  }

  let reminder = null;

  if (reminder_id) {
    reminder = await getReminderByUser(userId, vehicleId, reminder_id);

    if (reminder.service_type !== service_type) {
      throw createError(
        "Jenis servis tidak sesuai dengan reminder yang dipilih"
      );
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const historyResult = await client.query(
      `
      INSERT INTO service_history
        (
          vehicle_id,
          reminder_id,
          service_type,
          service_date,
          odometer_at_service,
          workshop_name,
          notes,
          cost
        )
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        vehicleId,
        reminder_id || null,
        service_type,
        service_date,
        odometerAtService,
        workshop_name || null,
        notes || null,
        serviceCost,
      ]
    );

    if (reminder) {
      const nextServiceKm = odometerAtService + reminder.interval_km;

      await client.query(
        `
        UPDATE service_reminders
        SET
          last_service_km = $1,
          next_service_km = $2,
          updated_at = now()
        WHERE id = $3
        `,
        [odometerAtService, nextServiceKm, reminder_id]
      );
    }

    await client.query("COMMIT");

    return historyResult.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getHistoryByVehicle,
  createServiceHistory,
};