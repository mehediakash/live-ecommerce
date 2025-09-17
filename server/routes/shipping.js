const express = require('express');
const shippingController = require('../controllers/shippingController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router.route('/profiles')
  .get(shippingController.getShippingProfiles)
  .post(shippingController.createShippingProfile);

router.route('/profiles/:id')
  .get(shippingController.getShippingProfile)
  .patch(shippingController.updateShippingProfile)
  .delete(shippingController.deleteShippingProfile);

router.post('/calculate', shippingController.calculateShipping);
router.post('/generate-label', shippingController.generateShippingLabel);

module.exports = router;