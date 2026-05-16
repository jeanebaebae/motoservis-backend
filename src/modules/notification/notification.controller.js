const notificationService = require("./notification.service");

const registerToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fcm_token, platform } = req.body;

    if (!fcm_token) {
      return res.status(400).json({
        success: false,
        message: "fcm_token is required",
      });
    }

    const token = await notificationService.registerToken(
      userId,
      fcm_token,
      platform || "web"
    );

    res.json({
      success: true,
      data: token,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  registerToken,
};