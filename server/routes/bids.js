const express = require('express');
const bidController = require('../controllers/bidController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .post(bidController.placeBid)
  .get(bidController.getUserBids);

router.get('/product/:productId', bidController.getProductBids);
router.delete('/:bidId', bidController.cancelBid);

module.exports = router;