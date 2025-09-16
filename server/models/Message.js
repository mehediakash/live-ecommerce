const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  attachments: [String]
}, {
  timestamps: true
});

messageSchema.index({ order: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1 });

module.exports = mongoose.model('Message', messageSchema);