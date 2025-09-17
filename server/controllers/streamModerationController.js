const Stream = require('../models/Stream');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

// Moderator Management
exports.addModerator = catchAsync(async (req, res, next) => {
  const { streamId, userId } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner or admin
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner can add moderators'
    });
  }

  // Check if user is already a moderator
  if (stream.moderation.moderators.includes(userId)) {
    return res.status(400).json({
      status: 'error',
      message: 'User is already a moderator'
    });
  }

  stream.moderation.moderators.push(userId);
  await stream.save();

  res.status(200).json({
    status: 'success',
    message: 'Moderator added successfully'
  });
});

exports.removeModerator = catchAsync(async (req, res, next) => {
  const { streamId, userId } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner or admin
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner can remove moderators'
    });
  }

  stream.moderation.moderators = stream.moderation.moderators.filter(
    mod => mod.toString() !== userId
  );
  await stream.save();

  res.status(200).json({
    status: 'success',
    message: 'Moderator removed successfully'
  });
});

// User Moderation
exports.banUser = catchAsync(async (req, res, next) => {
  const { streamId, userId, reason, duration } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner, moderator, or admin
  const isOwner = stream.seller.toString() === req.user.id;
  const isModerator = stream.moderation.moderators.includes(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isModerator && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner, moderators, or admins can ban users'
    });
  }

  // Remove existing ban if exists
  stream.moderation.bannedUsers = stream.moderation.bannedUsers.filter(
    ban => ban.user.toString() !== userId
  );

  // Add new ban
  stream.moderation.bannedUsers.push({
    user: userId,
    reason,
    duration: duration || 0 // 0 = permanent
  });

  await stream.save();

  res.status(200).json({
    status: 'success',
    message: 'User banned successfully'
  });
});

exports.muteUser = catchAsync(async (req, res, next) => {
  const { streamId, userId, reason, duration } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner, moderator, or admin
  const isOwner = stream.seller.toString() === req.user.id;
  const isModerator = stream.moderation.moderators.includes(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isModerator && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner, moderators, or admins can mute users'
    });
  }

  // Remove existing mute if exists
  stream.moderation.mutedUsers = stream.moderation.mutedUsers.filter(
    mute => mute.user.toString() !== userId
  );

  // Add new mute (default 10 minutes)
  stream.moderation.mutedUsers.push({
    user: userId,
    reason,
    duration: duration || 10
  });

  await stream.save();

  res.status(200).json({
    status: 'success',
    message: 'User muted successfully'
  });
});

exports.unbanUser = catchAsync(async (req, res, next) => {
  const { streamId, userId } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner, moderator, or admin
  const isOwner = stream.seller.toString() === req.user.id;
  const isModerator = stream.moderation.moderators.includes(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isModerator && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner, moderators, or admins can unban users'
    });
  }

  stream.moderation.bannedUsers = stream.moderation.bannedUsers.filter(
    ban => ban.user.toString() !== userId
  );

  await stream.save();

  res.status(200).json({
    status: 'success',
    message: 'User unbanned successfully'
  });
});

// Chat Settings
exports.updateChatSettings = catchAsync(async (req, res, next) => {
  const { streamId, slowMode, subscriberOnly, requireApproval, blockedWords } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner or admin
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner can update chat settings'
    });
  }

  if (slowMode !== undefined) {
    stream.moderation.slowMode.enabled = slowMode.enabled;
    if (slowMode.interval) {
      stream.moderation.slowMode.interval = slowMode.interval;
    }
  }

  if (subscriberOnly !== undefined) {
    stream.moderation.subscriberOnlyChat = subscriberOnly;
  }

  if (requireApproval !== undefined) {
    stream.moderation.requireApproval = requireApproval;
  }

  if (blockedWords !== undefined) {
    stream.moderation.blockedWords = blockedWords;
  }

  await stream.save();

  res.status(200).json({
    status: 'success',
    data: {
      moderation: stream.moderation
    }
  });
});

// Interactive Features - Polls
exports.createPoll = catchAsync(async (req, res, next) => {
  const { streamId, question, options } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner, moderator, or admin
  const isOwner = stream.seller.toString() === req.user.id;
  const isModerator = stream.moderation.moderators.includes(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isModerator && !isAdmin) {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner, moderators, or admins can create polls'
    });
  }

  const poll = {
    question,
    options: options.map(opt => ({ text: opt, votes: 0 })),
    isActive: true
  };

  stream.interactive.polls.push(poll);
  await stream.save();

  res.status(201).json({
    status: 'success',
    data: {
      poll: stream.interactive.polls[stream.interactive.polls.length - 1]
    }
  });
});

exports.voteInPoll = catchAsync(async (req, res, next) => {
  const { streamId, pollId, optionIndex } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  const poll = stream.interactive.polls.id(pollId);
  if (!poll || !poll.isActive) {
    return res.status(404).json({
      status: 'error',
      message: 'Poll not found or not active'
    });
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid option index'
    });
  }

  poll.options[optionIndex].votes += 1;
  await stream.save();

  res.status(200).json({
    status: 'success',
    data: {
      poll
    }
  });
});

// Interactive Features - Q&A
exports.enableQnA = catchAsync(async (req, res, next) => {
  const { streamId, enabled } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner or admin
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner can modify Q&A settings'
    });
  }

  stream.interactive.qna.enabled = enabled;
  await stream.save();

  res.status(200).json({
    status: 'success',
    data: {
      qna: stream.interactive.qna
    }
  });
});

exports.submitQuestion = catchAsync(async (req, res, next) => {
  const { streamId, question } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  if (!stream.interactive.qna.enabled) {
    return res.status(400).json({
      status: 'error',
      message: 'Q&A is not enabled for this stream'
    });
  }

  stream.interactive.qna.questions.push({
    user: req.user.id,
    question,
    isAnswered: false
  });

  await stream.save();

  res.status(201).json({
    status: 'success',
    data: {
      question: stream.interactive.qna.questions[stream.interactive.qna.questions.length - 1]
    }
  });
});

// Co-host Management
exports.addCoHost = catchAsync(async (req, res, next) => {
  const { streamId, userId, role } = req.body;

  const stream = await Stream.findById(streamId);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  // Check if user is stream owner or admin
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Only stream owner can add co-hosts'
    });
  }

  // Remove existing co-host if exists
  stream.coHosts = stream.coHosts.filter(
    cohost => cohost.user.toString() !== userId
  );

  stream.coHosts.push({
    user: userId,
    role: role || 'co-host'
  });

  await stream.save();

  res.status(200).json({
    status: 'success',
    message: 'Co-host added successfully'
  });
});