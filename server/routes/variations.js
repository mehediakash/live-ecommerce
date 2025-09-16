const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(authController.protect);

router.post('/:productId/variations', 
  upload.fields([{ name: 'variation_0_images', maxCount: 5 }]),
  productController.addVariation
);

router.patch('/:productId/variations/:variationId',
  upload.fields([{ name: 'images', maxCount: 5 }]),
  productController.updateVariation
);

router.delete('/:productId/variations/:variationId', 
  productController.deleteVariation
);

module.exports = router;