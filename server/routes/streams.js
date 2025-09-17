const express = require('express');
const streamController = require('../controllers/streamController');
const authController = require('../controllers/authController');

const { uploadConfigs } = require('../middleware/upload');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(streamController.getAllStreams)
  .post(uploadConfigs.stream, streamController.createStream);

router
  .route('/:id')
  .get(streamController.getStream)
  .patch(uploadConfigs.stream, streamController.updateStream)
  .delete(streamController.deleteStream);

router.patch('/:id/start', streamController.startStream);
router.patch('/:id/end', streamController.endStream);
router.post('/:id/viewer', streamController.addViewer);
router.delete('/:id/viewer', streamController.removeViewer);
router.post('/:id/moderator', streamController.addModerator);
router.delete('/:id/moderator', streamController.removeModerator);
router.patch('/:id/current-product', streamController.setCurrentProduct);

module.exports = router;