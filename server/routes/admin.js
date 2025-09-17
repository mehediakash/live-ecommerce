const express = require('express');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

const router = express.Router();

// All admin routes require admin role
router.use(authController.protect, authController.restrictTo('admin'));

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.patch('/users/:id/status', adminController.updateUserStatus);

// Seller Management
router.get('/sellers/applications', adminController.getSellerApplications);
router.patch('/sellers/:id/approve', adminController.approveSeller);

// Content Moderation
router.get('/moderation/:type', adminController.getFlaggedContent);
router.patch('/moderation/:type/:id/resolve', adminController.resolveFlaggedContent);

// Analytics and Reporting
router.get('/analytics/platform', adminController.getPlatformAnalytics);
router.get('/analytics/financial', adminController.getFinancialReports);

// System Settings
router.patch('/settings', adminController.updatePlatformSettings);

module.exports = router;