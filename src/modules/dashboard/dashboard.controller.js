const dashboardService = require("./dashboard.service");

const getDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService.getDashboard(req.user.id);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getDashboard,
};