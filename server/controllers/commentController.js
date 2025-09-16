const Comment = require('../models/Comment');
const Stream = require('../models/Stream');
const catchAsync = require('../utils/catchAsync');

exports.createComment = catchAsync(async (req, res, next) => {
  const { streamId, content, parentCommentId } = req.body;
  
  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if stream chat is enabled
  if (!stream.isChatEnabled) {
    return res.status(400).json({
      status: 'error',
      message: 'Chat is disabled for this stream'
    });
  }
  
  // Check if user is blocked from the stream
  // This would require additional logic based on your blocking system
  
  const commentData = {
    stream: streamId,
    user: req.user.id,
    content
  };
  
  if (parentCommentId) {
    const parentComment = await Comment.findById(parentCommentId);
    
    if (!parentComment) {
      return res.status(404).json({
        status: 'error',
        message: 'Parent comment not found'
      });
    }
    
    commentData.parentComment = parentCommentId;
  }
  
  const comment = await Comment.create(commentData);
  
  // If it's a reply, add to parent comment's replies
  if (parentCommentId) {
    await Comment.findByIdAndUpdate(
      parentCommentId,
      { $push: { replies: comment._id } }
    );
  }
  
  // Populate user info for response
  await comment.populate('user', 'profile firstName lastName');
  
  res.status(201).json({
    status: 'success',
    data: {
      comment
    }
  });
});

exports.getStreamComments = catchAsync(async (req, res, next) => {
  const { streamId } = req.params;
  const { page = 1, limit = 50, sort = '-createdAt' } = req.query;
  
  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  const comments = await Comment.find({
    stream: streamId,
    parentComment: null, // Only get top-level comments
    isDeleted: false
  })
    .populate('user', 'profile firstName lastName')
    .populate({
      path: 'replies',
      populate: {
        path: 'user',
        select: 'profile firstName lastName'
      }
    })
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Comment.countDocuments({
    stream: streamId,
    parentComment: null,
    isDeleted: false
  });
  
  res.status(200).json({
    status: 'success',
    results: comments.length,
    data: {
      comments,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.likeComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  
  const comment = await Comment.findById(commentId);
  
  if (!comment) {
    return res.status(404).json({
      status: 'error',
      message: 'Comment not found'
    });
  }
  
  // Check if user already liked the comment
  if (comment.likes.includes(req.user.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'You already liked this comment'
    });
  }
  
  comment.likes.push(req.user.id);
  comment.likeCount += 1;
  await comment.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      comment
    }
  });
});

exports.unlikeComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  
  const comment = await Comment.findById(commentId);
  
  if (!comment) {
    return res.status(404).json({
      status: 'error',
      message: 'Comment not found'
    });
  }
  
  // Check if user liked the comment
  if (!comment.likes.includes(req.user.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'You have not liked this comment'
    });
  }
  
  comment.likes = comment.likes.filter(
    userId => userId.toString() !== req.user.id
  );
  
  comment.likeCount -= 1;
  await comment.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      comment
    }
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  
  const comment = await Comment.findById(commentId);
  
  if (!comment) {
    return res.status(404).json({
      status: 'error',
      message: 'Comment not found'
    });
  }
  
  // Check if user is the comment owner, stream owner, or moderator
  const isCommentOwner = comment.user.toString() === req.user.id;
  const stream = await Stream.findById(comment.stream);
  const isStreamOwner = stream.seller.toString() === req.user.id;
  const isModerator = stream.moderators.includes(req.user.id);
  
  if (!isCommentOwner && !isStreamOwner && !isModerator && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to delete this comment'
    });
  }
  
  // Soft delete the comment
  comment.isDeleted = true;
  comment.content = '[deleted]';
  await comment.save();
  
  res.status(200).json({
    status: 'success',
    data: null
  });
});

exports.flagComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const { reason } = req.body;
  
  const comment = await Comment.findById(commentId);
  
  if (!comment) {
    return res.status(404).json({
      status: 'error',
      message: 'Comment not found'
    });
  }
  
  // Check if comment is already flagged
  if (comment.isFlagged) {
    return res.status(400).json({
      status: 'error',
      message: 'Comment is already flagged'
    });
  }
  
  comment.isFlagged = true;
  comment.flaggedReason = reason;
  await comment.save();
  
  // Notify moderators and admins about flagged comment
  // This would require additional notification logic
  
  res.status(200).json({
    status: 'success',
    data: {
      comment
    }
  });
});