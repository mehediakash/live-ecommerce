const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);
router.put('/update-password', authController.protect, authController.updatePassword);
router.post('/google', authController.googleAuth);
router.post('/facebook', authController.facebookAuth);
router.get('/social/urls', authController.getSocialAuthUrls);
router.post('/social/link', authController.protect, authController.linkSocialAccount);
router.post('/social/unlink', authController.protect, authController.unlinkSocialAccount);


module.exports = router;