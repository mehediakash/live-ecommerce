const express = require('express');
const socialController = require('../controllers/socialController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Invite System
router.post('/invite/stream', socialController.inviteFriendsToStream);

// Sharing
router.post('/share/generate-link', socialController.generateShareLink);

// Enhanced Following
router.post('/follow', socialController.followSeller);

// Preferences
router.post('/preferences/stream-quality', socialController.setStreamQualityPreference);

// Bulk Notifications
router.post('/notify/followers', socialController.notifyFollowers);

module.exports = router;