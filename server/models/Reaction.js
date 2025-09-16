const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
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
  type: {
    type: String,
    required: true,
    enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'fire', 'rocket', 'heart']
  }
}, {
  timestamps: true
});

reactionSchema.index({ stream: 1, user: 1 });
reactionSchema.index({ stream: 1, type: 1 });

module.exports = mongoose.model('Reaction', reactionSchema);