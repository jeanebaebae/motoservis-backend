const pool = require("../../config/db");
const admin = require("../../config/firebase");

const registerToken = async (userId, fcmToken, platform = "web") => {
  const result = await pool.query(
    `
    INSERT INTO user_device_tokens (
      user_id,
      fcm_token,
      platform,
      updated_at
    )
    VALUES ($1, $2, $3, now())
    ON CONFLICT (fcm_token)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      platform = EXCLUDED.platform,
      updated_at = now()
    RETURNING *
    `,
    [userId, fcmToken, platform]
  );

  return result.rows[0];
};

const sendReminderNotificationsForVehicle = async (userId, vehicleId) => {
  console.log("CHECK NOTIFICATION:", { userId, vehicleId });
  const debugResult = await pool.query(
  `
  SELECT
    sr.id,
    sr.vehicle_id,
    sr.service_type,
    sr.is_active,
    sr.next_service_km,
    sr.notify_before_km,
    sr.last_notified_at,
    v.user_id,
    v.current_odometer,
    sr.next_service_km - v.current_odometer AS remaining_km
  FROM service_reminders sr
  JOIN vehicles v ON v.id = sr.vehicle_id
  WHERE sr.vehicle_id = $1
  `,
  [vehicleId]
);

console.log("DEBUG REMINDERS RAW:", debugResult.rows);
  const remindersResult = await pool.query(
    `
    SELECT
      sr.id,
      sr.service_type,
      sr.next_service_km,
      sr.notify_before_km,
      sr.last_notified_at,
      v.name AS vehicle_name,
      v.current_odometer
    FROM service_reminders sr
    JOIN vehicles v ON v.id = sr.vehicle_id
    WHERE sr.vehicle_id = $1
      AND v.user_id = $2
      AND sr.is_active = true
      AND sr.last_notified_at IS NULL
      AND (sr.next_service_km - v.current_odometer) <= sr.notify_before_km
    `,
    [vehicleId, userId]
  );

  const reminders = remindersResult.rows;

  console.log("REMINDERS TO NOTIFY:", reminders);

  if (reminders.length === 0) {
    return {
      sent: 0,
      reminders: [],
    };
  }

  const tokensResult = await pool.query(
    `
    SELECT fcm_token
    FROM user_device_tokens
    WHERE user_id = $1
    `,
    [userId]
  );

  const tokens = tokensResult.rows.map((row) => row.fcm_token);

  console.log("FCM TOKENS:", tokens.length);

  if (tokens.length === 0) {
    return {
      sent: 0,
      reminders,
    };
  }

  let sentCount = 0;

  for (const reminder of reminders) {
    const remainingKm = Math.max(
      0,
      reminder.next_service_km - reminder.current_odometer
    );

    const message = {
      tokens,
      notification: {
        title: `${reminder.service_type} perlu servis`,
        body: `${reminder.vehicle_name} tersisa ${remainingKm} km menuju target servis.`,
      },
      data: {
        vehicle_id: vehicleId,
        reminder_id: reminder.id,
        service_type: reminder.service_type,
        remaining_km: String(remainingKm),
      },
    };

    console.log("SENDING FCM MESSAGE:", message.notification);

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("FCM RESPONSE:", response);

    sentCount += response.successCount;

    await pool.query(
      `
      UPDATE service_reminders
      SET last_notified_at = now()
      WHERE id = $1
      `,
      [reminder.id]
    );
  }

  return {
    sent: sentCount,
    reminders,
  };
};

module.exports = {
  registerToken,
  sendReminderNotificationsForVehicle,
};