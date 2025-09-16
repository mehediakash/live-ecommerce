const Reaction = require('../models/Reaction');
const Stream = require('../models/Stream');
const catchAsync = require('../utils/catchAsync');

exports.addReaction = catchAsync(async (req, res, next) => {
  const { streamId } = req.params;
  const { type } = req.body;
  
  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user already reacted with this type
  const existingReaction = await Reaction.findOne({
    stream: streamId,
    user: req.user.id,
    type
  });
  
  if (existingReaction) {
    return res.status(400).json({
      status: 'error',
      message: 'You already reacted with this type'
    });
  }
  
  // Remove any previous reaction from the same user
  await Reaction.deleteOne({
    stream: streamId,
    user: req.user.id
  });
  
  // Add new reaction
  const reaction = await Reaction.create({
    stream: streamId,
    user: req.user.id,
    type
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      reaction
    }
  });
});

exports.removeReaction = catchAsync(async (req, res, next) => {
  const { streamId } = req.params;
  
  const reaction = await Reaction.findOne({
    stream: streamId,
    user: req.user.id
  });
  
  if (!reaction) {
    return res.status(404).json({
      status: 'error',
      message: 'Reaction not found'
    });
  }
  
  await Reaction.findByIdAndDelete(reaction._id);
  
  res.status(200).json({
    status: 'success',
    data: null
  });
});

exports.getStreamReactions = catchAsync(async (req, res, next) => {
  const { streamId } = req.params;
  
  const reactions = await Reaction.aggregate([
    { $match: { stream: mongoose.Types.ObjectId(streamId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        users: { $push: '$user' }
      }
    }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      reactions
    }
  });
});

exports.getUserReaction = catchAsync(async (req, res, next) => {
  const { streamId } = req.params;
  
  const reaction = await Reaction.findOne({
    stream: streamId,
    user: req.user.id
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      reaction
    }
  });
});