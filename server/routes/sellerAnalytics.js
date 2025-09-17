const express = require('express');
const analyticsController = require('../controllers/sellerAnalyticsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('seller'));

router.get('/dashboard', analyticsController.getSellerDashboard);
router.get('/sales-report', analyticsController.getSalesReport);
router.get('/product-performance', analyticsController.getProductPerformance);
router.get('/stream-analytics', analyticsController.getStreamAnalytics);

module.exports = router;