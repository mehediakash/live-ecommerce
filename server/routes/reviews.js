const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .post(reviewController.createReview);

router.get('/product/:productId', reviewController.getProductReviews);
router.get('/seller/:sellerId', reviewController.getSellerReviews);
router.post('/:reviewId/helpful', reviewController.helpfulReview);
router.post('/:reviewId/response', reviewController.addResponse);

module.exports = router;