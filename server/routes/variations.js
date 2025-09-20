const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const { uploadConfigs } = require('../middleware/upload');
const optionalUpload = require('../middleware/optionalUpload');

const router = express.Router();

router.use(authController.protect);

// router.post('/:productId/variations', 
//   upload.fields([{ name: 'variation_0_images', maxCount: 5 }]),
//   productController.addVariation
// );

router.post(
  '/:productId/variations',
  optionalUpload(uploadConfigs.product), // now optional
  productController.addVariation
);
router.patch(
  '/:productId/variations/:variationId',
  uploadConfigs.variation, // ensures only valid fields are accepted
  productController.updateVariation
);

router.delete('/:productId/variations/:variationId', 
  productController.deleteVariation
);

module.exports = router;