const express = require("express");
const router = express.Router();

const authMiddleware = require("../../middleware/authmiddleware");
const notificationController = require("./notification.controller");

router.post(
  "/notifications/register-token",
  authMiddleware,
  notificationController.registerToken
);

module.exports = router;