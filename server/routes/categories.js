const express = require('express');
const categoryController = require('../controllers/categoryController');
const authController = require('../controllers/authController');

const { uploadConfigs } = require('../middleware/upload');

const router = express.Router();

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategory);
router.get('/:id/products', categoryController.getCategoryProducts);

router.use(authController.protect);

router.post('/', uploadConfigs.category, categoryController.createCategory);

router.patch('/:id', uploadConfigs.category, categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

router.patch('/:id/approve', authController.restrictTo('admin'), categoryController.approveCategory);
router.patch('/:id/reject', authController.restrictTo('admin'), categoryController.rejectCategory);

module.exports = router;