const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const { uploadConfigs } = require('../middleware/upload');

const router = express.Router();

// Public routes (no authentication needed)
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);

// Protected routes (authentication required)
router.use(authController.protect);

router.post('/', uploadConfigs.product, productController.createProduct);
router.post('/with-variations', (req, res, next) => {
  const variationCount = parseInt(req.body.variationCount) || 0;
  uploadConfigs.productWithVariations(variationCount)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: 'error',
        message: err.message
      });
    }
    next();
  });
}, productController.createProduct);

router.patch('/:id', uploadConfigs.product, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

router.post('/:id/auction/start', productController.startAuction);
router.post('/price-alert', productController.setPriceAlert);

module.exports = router;