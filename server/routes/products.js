const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(productController.getAllProducts)
  .post(
    upload.fields([
      { name: 'images', maxCount: 10 },
      { name: 'videos', maxCount: 5 }
    ]),
    productController.createProduct
  );

router
  .route('/:id')
  .get(productController.getProduct)
  .patch(
    upload.fields([
      { name: 'images', maxCount: 10 },
      { name: 'videos', maxCount: 5 }
    ]),
    productController.updateProduct
  )
  .delete(productController.deleteProduct);

router.post('/:id/auction/start', productController.startAuction);
router.post('/price-alert', productController.setPriceAlert);

module.exports = router;