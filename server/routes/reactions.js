const express = require('express');
const reactionController = require('../controllers/reactionController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/stream/:streamId')
  .post(reactionController.addReaction)
  .delete(reactionController.removeReaction)
  .get(reactionController.getStreamReactions);

router.get('/stream/:streamId/user', reactionController.getUserReaction);

module.exports = router;