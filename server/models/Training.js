const mongoose = require('mongoose');

const trainingModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  videoUrl: String,
  thumbnail: String,
  duration: {
    type: Number, // in minutes
    required: true
  },
  category: {
    type: String,
    enum: ['getting_started', 'streaming', 'product_management', 'marketing', 'advanced'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  order: {
    type: Number,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingModule'
  }],
  resources: [{
    title: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'article', 'template']
    },
    url: String
  }],
  quiz: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const userProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingModule',
    required: true
  },
  progress: {
    type: Number, // percentage
    default: 0,
    min: 0,
    max: 100
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  quizScore: {
    type: Number,
    min: 0,
    max: 100
  },
  notes: String,
  lastAccessed: Date
}, {
  timestamps: true
});

// Indexes
trainingModuleSchema.index({ category: 1, order: 1 });
trainingModuleSchema.index({ isPublished: 1 });
userProgressSchema.index({ user: 1, module: 1 }, { unique: true });
userProgressSchema.index({ user: 1, completed: 1 });

const TrainingModule = mongoose.model('TrainingModule', trainingModuleSchema);
const UserProgress = mongoose.model('UserProgress', userProgressSchema);

module.exports = { TrainingModule, UserProgress };