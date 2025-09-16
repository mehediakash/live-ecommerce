const express = require('express');
const trendingController = require('../controllers/trendingController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/products', trendingController.getTrendingProducts);
router.patch('/engagement', authController.protect, trendingController.updateProductEngagement);

module.exports = router;