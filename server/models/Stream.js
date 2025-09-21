const mongoose = require('mongoose');

const streamSchema = new mongoose.Schema({
  // Basic stream info
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
  },
 category: {  // <-- change here
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  tags: [String],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ivsChannelArn: {
    type: String,
    required: true
  },
  ivsPlaybackUrl: String,
  ivsStreamKey: String,
  streamKey: String, // For internal use
  ivsIngestEndpoint: String, // ← ADD THIS FIELD
  recordedUrl:String,
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  scheduledStart: {
    type: Date,
    required: true
  },
  actualStart: Date,
  actualEnd: Date,
  duration: Number, // in minutes
  viewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  peakViewers: {
    type: Number,
    default: 0
  },
  totalViewers: {
    type: Number,
    default: 0
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  currentProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  coHosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isChatEnabled: {
    type: Boolean,
    default: true
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  analytics: {
    avgViewTime: Number,
    engagementRate: Number,
    clickThroughRate: Number
  },

  // Enhanced moderation fields
  moderation: {
    isModerated: {
      type: Boolean,
      default: false
    },
    bannedUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String,
      bannedAt: {
        type: Date,
        default: Date.now
      },
      duration: Number // in minutes, 0 = permanent
    }],
    mutedUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String,
      mutedAt: {
        type: Date,
        default: Date.now
      },
      duration: Number // in minutes
    }],
    blockedWords: [String],
    requireApproval: {
      type: Boolean,
      default: false
    },
    slowMode: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: Number,
        default: 5 // seconds between messages
      }
    },
    subscriberOnlyChat: {
      type: Boolean,
      default: false
    }
  },

  // Interactive features
  interactive: {
    polls: [{
      question: String,
      options: [{
        text: String,
        votes: {
          type: Number,
          default: 0
        }
      }],
      isActive: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    qna: {
      enabled: {
        type: Boolean,
        default: false
      },
      questions: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        question: String,
        isAnswered: {
          type: Boolean,
          default: false
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }]
    },
    giveaways: [{
      title: String,
      description: String,
      prize: String,
      winnerCount: Number,
      entrants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      winners: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      endTime: Date,
      isActive: {
        type: Boolean,
        default: true
      }
    }]
  },

  // Co-hosts with roles
  coHosts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['co-host', 'guest', 'expert'],
      default: 'co-host'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Stream quality settings
  streamSettings: {
    quality: {
      type: String,
      enum: ['auto', '360p', '480p', '720p', '1080p', '4k'],
      default: 'auto'
    },
    latency: {
      type: String,
      enum: ['normal', 'low', 'ultra-low'],
      default: 'normal'
    },
    recording: {
      enabled: {
        type: Boolean,
        default: false
      },
      quality: {
        type: String,
        enum: ['360p', '480p', '720p', '1080p', '4k'],
        default: '720p'
      }
    }
  }

}, {
  timestamps: true
});

// Indexes
streamSchema.index({ seller: 1, status: 1 });
streamSchema.index({ scheduledStart: 1 });
streamSchema.index({ category: 1, status: 1 });
streamSchema.index({ 'moderation.bannedUsers.user': 1 });
streamSchema.index({ 'moderation.mutedUsers.user': 1 });
streamSchema.index({ 'interactive.polls.isActive': 1 });
streamSchema.index({ 'interactive.giveaways.isActive': 1 });

module.exports = mongoose.model('Stream', streamSchema);
