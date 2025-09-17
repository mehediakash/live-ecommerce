const express = require('express');
const trainingController = require('../controllers/trainingController');
const authController = require('../controllers/authController');
const { uploadConfigs } = require('../middleware/upload');

const router = express.Router();

router.use(authController.protect);

// Get training modules
router.get('/modules', trainingController.getTrainingModules);
router.get('/modules/:id', trainingController.getTrainingModule);

// User progress
router.get('/progress', trainingController.getUserProgress);
router.post('/progress', trainingController.updateProgress);
router.get('/certificate', trainingController.getCertificate);

// Admin routes (for managing training content)
router.use(authController.restrictTo('admin'));
router.post('/modules', uploadConfigs.product, trainingController.createModule);
router.patch('/modules/:id', uploadConfigs.product, trainingController.updateModule);
router.delete('/modules/:id', trainingController.deleteModule);

module.exports = router;