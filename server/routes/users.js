const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const { uploadConfigs } = require('../middleware/upload');
const fixCloudinaryPath = require('../middleware/fixCloudinaryPath');


const router = express.Router();

router.use(authController.protect);

router.get('/profile', userController.getProfile);
router.put('/profile', uploadConfigs.user, userController.updateProfile);
router.patch('/addresses', userController.manageAddresses);
router.patch('/wishlist', userController.manageWishlist);
router.patch('/follow', userController.followUser);
router.get('/notifications', userController.getNotifications);
router.patch('/notifications/read', userController.markNotificationsAsRead);
router.delete('/notifications', userController.deleteNotifications);

module.exports = router;