const express = require('express');
const bulkController = require('../controllers/bulkOperationsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect, authController.restrictTo('seller'));

router.patch('/products', bulkController.bulkUpdateProducts);
router.patch('/inventory', bulkController.bulkUpdateInventory);
router.patch('/orders', bulkController.bulkUpdateOrderStatus);
router.post('/products', bulkController.bulkCreateProducts);
router.get('/products/export', bulkController.exportProductCatalog);

module.exports = router;