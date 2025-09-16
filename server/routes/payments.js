const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.post('/create-intent', paymentController.createPaymentIntent);
router.post('/create-checkout-session', paymentController.createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);
router.post('/refund', authController.restrictTo('admin', 'seller'), paymentController.processRefund);

module.exports = router;