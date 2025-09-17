const { TrainingModule, UserProgress } = require('../models/Training');
const catchAsync = require('../utils/catchAsync');

// Get all training modules
exports.getTrainingModules = catchAsync(async (req, res, next) => {
  const { category, difficulty, publishedOnly } = req.query;
  
  const filter = {};
  
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;
  if (publishedOnly === 'true') filter.isPublished = true;
  
  const modules = await TrainingModule.find(filter)
    .populate('prerequisites', 'title')
    .populate('createdBy', 'profile firstName lastName')
    .sort({ category: 1, order: 1 });
  
  res.status(200).json({
    status: 'success',
    results: modules.length,
    data: {
      modules
    }
  });
});

// Get single training module
exports.getTrainingModule = catchAsync(async (req, res, next) => {
  const module = await TrainingModule.findById(req.params.id)
    .populate('prerequisites', 'title description duration')
    .populate('createdBy', 'profile firstName lastName')
    .populate('updatedBy', 'profile firstName lastName');
  
  if (!module) {
    return res.status(404).json({
      status: 'error',
      message: 'Training module not found'
    });
  }
  
  // Check if user has access (published or admin)
  if (!module.isPublished && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'This training module is not published yet'
    });
  }
  
  // Get user progress for this module
  const userProgress = await UserProgress.findOne({
    user: req.user.id,
    module: req.params.id
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      module: {
        ...module.toObject(),
        userProgress
      }
    }
  });
});

// Get user progress across all modules
exports.getUserProgress = catchAsync(async (req, res, next) => {
  const userProgress = await UserProgress.find({ user: req.user.id })
    .populate('module', 'title category difficulty duration')
    .sort({ updatedAt: -1 });
  
  // Calculate overall progress
  const totalModules = await TrainingModule.countDocuments({ isPublished: true });
  const completedModules = userProgress.filter(up => up.completed).length;
  const overallProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
  
  res.status(200).json({
    status: 'success',
    data: {
      progress: userProgress,
      summary: {
        totalModules,
        completedModules,
        inProgressModules: userProgress.length - completedModules,
        overallProgress: Math.round(overallProgress)
      }
    }
  });
});

// Update user progress
exports.updateProgress = catchAsync(async (req, res, next) => {
  const { moduleId, progress, completed, quizScore, notes } = req.body;
  
  const module = await TrainingModule.findById(moduleId);
  if (!module || !module.isPublished) {
    return res.status(404).json({
      status: 'error',
      message: 'Training module not found or not published'
    });
  }
  
  // Check prerequisites if marking as completed
  if (completed) {
    const prerequisites = module.prerequisites || [];
    if (prerequisites.length > 0) {
      const prerequisiteProgress = await UserProgress.find({
        user: req.user.id,
        module: { $in: prerequisites },
        completed: true
      });
      
      if (prerequisiteProgress.length !== prerequisites.length) {
        return res.status(400).json({
          status: 'error',
          message: 'Complete all prerequisite modules first'
        });
      }
    }
  }
  
  const updateData = {
    progress: Math.min(Math.max(progress || 0, 0), 100),
    lastAccessed: new Date()
  };
  
  if (completed !== undefined) {
    updateData.completed = completed;
    if (completed) {
      updateData.completedAt = new Date();
    }
  }
  
  if (quizScore !== undefined) {
    updateData.quizScore = quizScore;
  }
  
  if (notes !== undefined) {
    updateData.notes = notes;
  }
  
  const userProgress = await UserProgress.findOneAndUpdate(
    { user: req.user.id, module: moduleId },
    updateData,
    { new: true, upsert: true, runValidators: true }
  ).populate('module', 'title category');
  
  res.status(200).json({
    status: 'success',
    data: {
      progress: userProgress
    }
  });
});

// Get training certificate
exports.getCertificate = catchAsync(async (req, res, next) => {
  const { moduleId } = req.query;
  
  let progress;
  if (moduleId) {
    // Get certificate for specific module
    progress = await UserProgress.findOne({
      user: req.user.id,
      module: moduleId,
      completed: true
    }).populate('module', 'title category duration');
    
    if (!progress) {
      return res.status(404).json({
        status: 'error',
        message: 'No completed training found for this module'
      });
    }
  } else {
    // Get overall completion certificate
    const completedModules = await UserProgress.countDocuments({
      user: req.user.id,
      completed: true
    });
    
    const totalModules = await TrainingModule.countDocuments({ isPublished: true });
    
    if (completedModules === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No training modules completed yet'
      });
    }
    
    progress = {
      type: 'overall',
      completedModules,
      totalModules,
      completionRate: Math.round((completedModules / totalModules) * 100)
    };
  }
  
  // In a real implementation, you would generate a PDF certificate
  // For now, we'll return the data that would be used to generate it
  
  const certificateData = {
    user: {
      id: req.user.id,
      name: `${req.user.profile.firstName} ${req.user.profile.lastName}`,
      email: req.user.email
    },
    progress,
    issueDate: new Date(),
    certificateId: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    verificationUrl: `${process.env.CLIENT_URL}/verify-certificate/${progress._id || 'overall'}`
  };
  
  res.status(200).json({
    status: 'success',
    data: {
      certificate: certificateData
    }
  });
});

// Admin: Create training module
exports.createModule = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    content,
    videoUrl,
    duration,
    category,
    difficulty,
    order,
    prerequisites,
    resources,
    quiz
  } = req.body;
  
  const module = await TrainingModule.create({
    title,
    description,
    content,
    videoUrl,
    thumbnail: req.file ? req.file.path : undefined,
    duration,
    category,
    difficulty,
    order,
    prerequisites,
    resources,
    quiz,
    createdBy: req.user.id,
    isPublished: false
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      module
    }
  });
});

// Admin: Update training module
exports.updateModule = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    content,
    videoUrl,
    duration,
    category,
    difficulty,
    order,
    isPublished,
    prerequisites,
    resources,
    quiz
  } = req.body;
  
  const updateData = {
    title,
    description,
    content,
    videoUrl,
    duration,
    category,
    difficulty,
    order,
    isPublished,
    prerequisites,
    resources,
    quiz,
    updatedBy: req.user.id
  };
  
  if (req.file) {
    updateData.thumbnail = req.file.path;
  }
  
  const module = await TrainingModule.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  
  if (!module) {
    return res.status(404).json({
      status: 'error',
      message: 'Training module not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      module
    }
  });
});

// Admin: Delete training module
exports.deleteModule = catchAsync(async (req, res, next) => {
  const module = await TrainingModule.findById(req.params.id);
  
  if (!module) {
    return res.status(404).json({
      status: 'error',
      message: 'Training module not found'
    });
  }
  
  // Check if module has user progress
  const progressCount = await UserProgress.countDocuments({ module: req.params.id });
  
  if (progressCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete module with user progress. Archive it instead.'
    });
  }
  
  await TrainingModule.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});