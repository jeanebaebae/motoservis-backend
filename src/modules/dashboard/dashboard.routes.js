const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authmiddleware");
const dashboardController = require("./dashboard.controller");

router.get("/", authMiddleware, dashboardController.getDashboard);

module.exports = router;