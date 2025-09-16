const express = require('express');
const messageController = require('../controllers/messageController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .post(messageController.sendMessage)
  .get(messageController.getConversations);

router.get('/order/:orderId', messageController.getOrderMessages);
router.patch('/read', messageController.markAsRead);

module.exports = router;