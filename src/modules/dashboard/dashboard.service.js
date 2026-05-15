const pool = require("../../config/db");

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

const getDashboard = async (userId) => {
  const vehiclesResult = await pool.query(
    `
    SELECT *
    FROM vehicles
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  const vehicles = vehiclesResult.rows;

  const mappedVehicles = [];

  let totalAttentionVehicles = 0;

  for (const vehicle of vehicles) {
    const remindersResult = await pool.query(
      `
      SELECT *
      FROM service_reminders
      WHERE vehicle_id = $1
        AND is_active = true
      ORDER BY created_at DESC
      `,
      [vehicle.id]
    );

    const reminders = remindersResult.rows;

    const mappedReminders = reminders.map((reminder) => {
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

    const attentionReminders = mappedReminders.filter(
      (reminder) => reminder.status === "Perlu Perhatian"
    );

    const hasAttention = attentionReminders.length > 0;

    if (hasAttention) {
      totalAttentionVehicles++;
    }

    mappedVehicles.push({
      id: vehicle.id,
      name: vehicle.name,
      brand: vehicle.brand,
      year: vehicle.year,
      plate_number: vehicle.plate_number,
      current_odometer: vehicle.current_odometer,
      dashboard_status: hasAttention ? "Perlu Perhatian" : "Servis OK",
      active_reminder_count: reminders.length,
      attention_count: attentionReminders.length,

      // Ini yang dipakai frontend untuk menampilkan progress bar.
      // Kalau array ini kosong, frontend cukup tampilkan "Servis OK".
      attention_reminders: attentionReminders,
    });
  }

  return {
    summary: {
      total_vehicles: vehicles.length,
      total_attention_vehicles: totalAttentionVehicles,
    },
    vehicles: mappedVehicles,
  };
};

module.exports = {
  getDashboard,
};