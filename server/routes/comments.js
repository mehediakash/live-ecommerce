const express = require('express');
const commentController = require('../controllers/commentController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .post(commentController.createComment);

router.get('/stream/:streamId', commentController.getStreamComments);
router.post('/:commentId/like', commentController.likeComment);
router.delete('/:commentId/like', commentController.unlikeComment);
router.delete('/:commentId', commentController.deleteComment);
router.post('/:commentId/flag', commentController.flagComment);

module.exports = router;