const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  isFlagged: {
    type: Boolean,
    default: false
  },
  flaggedReason: String,
  isDeleted: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likeCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

commentSchema.index({ stream: 1, createdAt: -1 });
commentSchema.index({ user: 1, stream: 1 });

module.exports = mongoose.model('Comment', commentSchema);