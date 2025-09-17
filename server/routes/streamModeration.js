const express = require('express');
const moderationController = require('../controllers/streamModerationController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Moderator Management
router.post('/moderators/add', moderationController.addModerator);
router.post('/moderators/remove', moderationController.removeModerator);

// User Moderation
router.post('/ban', moderationController.banUser);
router.post('/mute', moderationController.muteUser);
router.post('/unban', moderationController.unbanUser);

// Chat Settings
router.post('/chat-settings', moderationController.updateChatSettings);

// Interactive Features
router.post('/polls/create', moderationController.createPoll);
router.post('/polls/vote', moderationController.voteInPoll);
router.post('/qna/enable', moderationController.enableQnA);
router.post('/qna/submit-question', moderationController.submitQuestion);

// Co-host Management
router.post('/cohosts/add', moderationController.addCoHost);

module.exports = router;