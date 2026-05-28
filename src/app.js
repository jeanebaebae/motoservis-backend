const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const authMiddleware = require("./middleware/authmiddleware");
const vehicleRoutes = require("./modules/vehicle/vehicle.routes");
const reminderRoutes = require("./modules/reminder/reminder.routes");
const serviceHistoryRoutes = require("./modules/service_history/serviceHistory.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "MotoServis API Running",
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM vehicles
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.get("/test-auth", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Token valid",
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

app.use("/api/vehicles", vehicleRoutes);
app.use("/api", reminderRoutes);
app.use("/api", serviceHistoryRoutes);
app.use("/api/dashboard", dashboardRoutes);

module.exports = app;