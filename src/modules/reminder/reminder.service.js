const pool = require("../../config/db");

const ALLOWED_SERVICE_TYPES = [
  "Oli Mesin",
  "Filter Udara",
  "Oli Gardan",
  "Rantai",
  "Kampas Rem",
  "Busi",
  "CVT",
  "Roller",
  "Lainnya",
];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getFinalServiceType = (data) => {
  const { service_type, custom_service_type } = data;

  if (!service_type) {
    throw createError("Jenis servis wajib diisi");
  }

  if (!ALLOWED_SERVICE_TYPES.includes(service_type)) {
    throw createError("Jenis servis tidak valid");
  }

  if (service_type === "Lainnya") {
    if (!custom_service_type || custom_service_type.trim() === "") {
      throw createError("Custom jenis servis wajib diisi");
    }

    return custom_service_type.trim();
  }

  return service_type;
};

const getReminderStatus = (remainingKm, notifyBeforeKm) => {
  if (remainingKm > notifyBeforeKm) {
    return "Aman";
  }

  return "Perlu Perhatian";
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

const getReminderByUser = async (userId, reminderId) => {
  const result = await pool.query(
    `
    SELECT
      sr.*,
      v.user_id,
      v.current_odometer
    FROM service_reminders sr
    JOIN vehicles v ON v.id = sr.vehicle_id
    WHERE sr.id = $1 AND v.user_id = $2
    `,
    [reminderId, userId]
  );

  if (result.rows.length === 0) {
    throw createError("Reminder tidak ditemukan", 404);
  }

  return result.rows[0];
};

const checkDuplicateServiceType = async (
  vehicleId,
  serviceType,
  excludeReminderId = null
) => {
  let query = `
    SELECT id
    FROM service_reminders
    WHERE vehicle_id = $1
      AND service_type = $2
      AND is_active = true
  `;

  const params = [vehicleId, serviceType];

  if (excludeReminderId) {
    query += ` AND id != $3`;
    params.push(excludeReminderId);
  }

  const result = await pool.query(query, params);

  if (result.rows.length > 0) {
    throw createError(
      `Reminder untuk ${serviceType} sudah ada di kendaraan ini`
    );
  }
};

const getRemindersByVehicle = async (userId, vehicleId) => {
  const vehicle = await getVehicleByUser(userId, vehicleId);

  const result = await pool.query(
    `
    SELECT *
    FROM service_reminders
    WHERE vehicle_id = $1
      AND is_active = true
    ORDER BY created_at DESC
    `,
    [vehicleId]
  );

  return result.rows.map((reminder) => {
    const remainingKm = reminder.next_service_km - vehicle.current_odometer;
    const status = getReminderStatus(
      remainingKm,
      reminder.notify_before_km
    );

    const progressPercentage = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          ((vehicle.current_odometer - reminder.last_service_km) /
            reminder.interval_km) *
            100
        )
      )
    );

    return {
      ...reminder,
      current_odometer: vehicle.current_odometer,
      remaining_km: remainingKm,
      status,
      progress_percentage: progressPercentage,
    };
  });
};

const getAllReminders = async (userId) => {
  const result = await pool.query(
    `
    SELECT
      sr.*,
      v.name AS vehicle_name,
      v.current_odometer
    FROM service_reminders sr
    JOIN vehicles v
      ON v.id = sr.vehicle_id
    WHERE v.user_id = $1
      AND sr.is_active = true
    ORDER BY sr.next_service_km ASC
    `,
    [userId]
  );

  return result.rows.map((reminder) => {
    const remainingKm =
      reminder.next_service_km - reminder.current_odometer;

    const progressPercentage = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (
            (reminder.current_odometer -
              reminder.last_service_km) /
            reminder.interval_km
          ) * 100
        )
      )
    );

    let status = "Aman";

    if (remainingKm <= reminder.notify_before_km) {
      status = "Perlu Perhatian";
    }

    return {
      ...reminder,
      remaining_km: remainingKm,
      progress_percentage: progressPercentage,
      status,
    };
  });
};

const createReminder = async (userId, vehicleId, data) => {
  const vehicle = await getVehicleByUser(userId, vehicleId);

  const serviceType = getFinalServiceType(data);

  const intervalKm = Number(data.interval_km);
  const lastServiceKm = Number(data.last_service_km);
  const notifyBeforeKm = data.notify_before_km
    ? Number(data.notify_before_km)
    : 200;

  if (!intervalKm || intervalKm <= 0) {
    throw createError("Interval servis harus lebih dari 0");
  }

  if (lastServiceKm < 0) {
    throw createError("KM servis terakhir tidak boleh negatif");
  }

  if (lastServiceKm > vehicle.current_odometer) {
    throw createError(
      "KM servis terakhir tidak boleh lebih besar dari odometer sekarang"
    );
  }

  if (notifyBeforeKm < 0) {
    throw createError("Notifikasi sebelum tidak boleh negatif");
  }

  await checkDuplicateServiceType(vehicleId, serviceType);

  const nextServiceKm = lastServiceKm + intervalKm;

  const result = await pool.query(
    `
    INSERT INTO service_reminders
      (
        vehicle_id,
        service_type,
        interval_km,
        last_service_km,
        next_service_km,
        notify_before_km
      )
    VALUES
      ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      vehicleId,
      serviceType,
      intervalKm,
      lastServiceKm,
      nextServiceKm,
      notifyBeforeKm,
    ]
  );

  return result.rows[0];
};

const updateReminder = async (userId, reminderId, data) => {
  const existingReminder = await getReminderByUser(userId, reminderId);

  const vehicle = await getVehicleByUser(
    userId,
    existingReminder.vehicle_id
  );

  const serviceType = getFinalServiceType(data);

  const intervalKm = Number(data.interval_km);
  const lastServiceKm = Number(data.last_service_km);
  const notifyBeforeKm = data.notify_before_km
    ? Number(data.notify_before_km)
    : 200;

  if (!intervalKm || intervalKm <= 0) {
    throw createError("Interval servis harus lebih dari 0");
  }

  if (lastServiceKm < 0) {
    throw createError("KM servis terakhir tidak boleh negatif");
  }

  if (lastServiceKm > vehicle.current_odometer) {
    throw createError(
      "KM servis terakhir tidak boleh lebih besar dari odometer sekarang"
    );
  }

  if (notifyBeforeKm < 0) {
    throw createError("Notifikasi sebelum tidak boleh negatif");
  }

  await checkDuplicateServiceType(
    existingReminder.vehicle_id,
    serviceType,
    reminderId
  );

  const nextServiceKm = lastServiceKm + intervalKm;

  const result = await pool.query(
    `
    UPDATE service_reminders
    SET
      service_type = $1,
      interval_km = $2,
      last_service_km = $3,
      next_service_km = $4,
      notify_before_km = $5,
      updated_at = now()
    WHERE id = $6
    RETURNING *
    `,
    [
      serviceType,
      intervalKm,
      lastServiceKm,
      nextServiceKm,
      notifyBeforeKm,
      reminderId,
    ]
  );

  return result.rows[0];
};

const deleteReminder = async (userId, reminderId) => {
  await getReminderByUser(userId, reminderId);

  await pool.query(
    `
    DELETE FROM service_reminders
    WHERE id = $1
    `,
    [reminderId]
  );
};

module.exports = {
  getAllReminders,
  getRemindersByVehicle,
  createReminder,
  updateReminder,
  deleteReminder,
};