const User = require('../models/User');
const Stream = require('../models/Stream');
const NotificationService = require('../services/notificationService');
const catchAsync = require('../utils/catchAsync');

// Invite System
exports.inviteFriendsToStream = catchAsync(async (req, res, next) => {
  const { streamId, friendIds, message } = req.body;

  const stream = await Stream.findById(streamId);
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  const io = req.app.get('io');

  // Send notifications to friends
  const results = await Promise.allSettled(
    friendIds.map(async friendId => {
      await NotificationService.sendNotification(
        io,
        friendId,
        'stream_invite',
        'Stream Invitation',
        `${req.user.profile.firstName} invited you to watch their stream: ${stream.title}`,
        {
          streamId: stream._id.toString(),
          inviterId: req.user.id,
          message: message
        }
      );
    })
  );

  const successfulInvites = results.filter(r => r.status === 'fulfilled').length;

  res.status(200).json({
    status: 'success',
    message: `Invites sent to ${successfulInvites} friends`,
    data: {
      successful: successfulInvites,
      failed: results.length - successfulInvites
    }
  });
});

// Stream Sharing
exports.generateShareLink = catchAsync(async (req, res, next) => {
  const { streamId, platform } = req.body;

  const stream = await Stream.findById(streamId);
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }

  const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const streamUrl = `${baseUrl}/stream/${streamId}`;

  let shareText = '';
  switch (platform) {
    case 'twitter':
      shareText = `Check out this live stream: ${stream.title} ${streamUrl}`;
      break;
    case 'facebook':
      shareText = `I'm live streaming! Watch here: ${streamUrl}`;
      break;
    case 'whatsapp':
      shareText = `Join my live stream: ${stream.title} ${streamUrl}`;
      break;
    default:
      shareText = `Watch my live stream: ${stream.title} - ${streamUrl}`;
  }

  res.status(200).json({
    status: 'success',
    data: {
      url: streamUrl,
      shareText: encodeURIComponent(shareText),
      platform
    }
  });
});

// Enhanced Follow System with Notifications
exports.followSeller = catchAsync(async (req, res, next) => {
  const { sellerId } = req.body;

  if (sellerId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot follow yourself'
    });
  }

  const seller = await User.findById(sellerId);
  if (!seller || seller.role !== 'seller') {
    return res.status(404).json({
      status: 'error',
      message: 'Seller not found'
    });
  }

  // Check if already following
  const isAlreadyFollowing = req.user.following.includes(sellerId);
  if (isAlreadyFollowing) {
    return res.status(400).json({
      status: 'error',
      message: 'Already following this seller'
    });
  }

  // Add to following list
  req.user.following.push(sellerId);
  await req.user.save();

  // Add to seller's followers
  seller.followers.push(req.user.id);
  await seller.save();

  // Send notification to seller
  const io = req.app.get('io');
  await NotificationService.sendNotification(
    io,
    sellerId,
    'new_follower',
    'New Follower',
    `${req.user.profile.firstName} ${req.user.profile.lastName} started following you`,
    {
      followerId: req.user.id
    }
  );

  res.status(200).json({
    status: 'success',
    message: 'Successfully followed seller'
  });
});

// Stream Quality Preferences
exports.setStreamQualityPreference = catchAsync(async (req, res, next) => {
  const { quality, latency } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      'streamPreferences.quality': quality,
      'streamPreferences.latency': latency
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      preferences: user.streamPreferences
    }
  });
});

// Bulk Notification to Followers
exports.notifyFollowers = catchAsync(async (req, res, next) => {
  const { message, streamId } = req.body;

  const io = req.app.get('io');
  
  // Send notification to all followers
  const results = await NotificationService.sendBulkNotifications(
    io,
    req.user.followers,
    'creator_announcement',
    'Announcement from Creator',
    message,
    {
      streamId: streamId,
      creatorId: req.user.id
    }
  );

  const successful = results.filter(r => r.status === 'success').length;

  res.status(200).json({
    status: 'success',
    message: `Notification sent to ${successful} followers`,
    data: {
      successful,
      failed: results.length - successful
    }
  });
});