const express = require('express');
const trendingController = require('../controllers/trendingController');
const authController = require('../controllers/authController');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.get('/products', trendingController.getTrendingProducts);
router.get('/categories', trendingController.getTrendingCategories);

// Admin route to manually update trending products
router.post(
  '/update',
  catchAsync(async (req, res) => {
    await trendingController.updateTrendingProducts();
    res.status(200).json({
      status: 'success',
      message: 'Trending products updated successfully'
    });
  })
);

module.exports = router;