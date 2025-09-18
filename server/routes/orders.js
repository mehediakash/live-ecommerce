const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/')
  .get(orderController.getUserOrders)
  .post(orderController.createOrder);

router.route('/shipping-options')
  .post(orderController.getShippingOptions);

router.route('/:id')
  .get(orderController.getOrder)
  .patch(orderController.updateOrderStatus);

router.post('/:id/return', orderController.requestReturn);
router.post('/:id/refund', orderController.processRefund);

module.exports = router;