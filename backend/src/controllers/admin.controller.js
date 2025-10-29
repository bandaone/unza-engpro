const adminService = require('../services/admin.service');

/**
 * Get system-wide statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSystemStatistics = async (req, res) => {
  try {
    const statistics = await adminService.getSystemStatistics();
    res.status(200).json(statistics);
  } catch (error) {
    console.error('Error getting system statistics:', error);
    res.status(500).json({
      message: 'Error retrieving system statistics',
      error: error.message
    });
  }
};

/**
 * Get allocation report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllocationReport = async (req, res) => {
  try {
    const report = await adminService.getAllocationReport();
    res.status(200).json(report);
  } catch (error) {
    console.error('Error generating allocation report:', error);
    res.status(500).json({
      message: 'Error generating allocation report',
      error: error.message
    });
  }
};

/**
 * Get student progress report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getStudentProgressReport = async (req, res) => {
  try {
    const report = await adminService.getStudentProgressReport();
    res.status(200).json(report);
  } catch (error) {
    console.error('Error generating student progress report:', error);
    res.status(500).json({
      message: 'Error generating student progress report',
      error: error.message
    });
  }
};

/**
 * Get system settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSystemSettings = async (req, res) => {
  try {
    const settings = await adminService.getSystemSettings();
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error retrieving system settings:', error);
    res.status(500).json({
      message: 'Error retrieving system settings',
      error: error.message
    });
  }
};

/**
 * Update system setting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateSystemSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        message: 'Setting key and value are required'
      });
    }

    const updatedSetting = await adminService.updateSystemSetting(
      key,
      value,
      req.user.id
    );
    
    res.status(200).json(updatedSetting);
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({
      message: 'Error updating system setting',
      error: error.message
    });
  }
};

module.exports = {
  getSystemStatistics,
  getAllocationReport,
  getStudentProgressReport,
  getSystemSettings,
  updateSystemSetting
};