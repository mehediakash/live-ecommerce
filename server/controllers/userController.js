const Notification = require('../models/Notification');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const catchAsync = require('../utils/catchAsync');

exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('wishlist')
    .populate('followers', 'profile firstName lastName')
    .populate('following', 'profile firstName lastName');
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const {
    firstName,
    lastName,
    bio,
    phone,
    preferences,
    privacySettings,
    notifications
  } = req.body;
  
  const updateData = {};
  
  if (firstName) updateData['profile.firstName'] = firstName;
  if (lastName) updateData['profile.lastName'] = lastName;
  if (bio) updateData['profile.bio'] = bio;
  if (phone) updateData.phone = phone;
  if (preferences) updateData['profile.preferences'] = JSON.parse(preferences);
  if (privacySettings) updateData.privacySettings = JSON.parse(privacySettings);
  if (notifications) updateData.notifications = JSON.parse(notifications);
  
  if (req.file) {
    updateData['profile.avatar'] = req.file.path;
  }
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.manageAddresses = catchAsync(async (req, res, next) => {
  const { action, addressId, addressData } = req.body;
  
  let user;
  
  switch (action) {
    case 'add':
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $push: { shippingAddresses: addressData } },
        { new: true }
      );
      break;
      
    case 'update':
      user = await User.findOneAndUpdate(
        { _id: req.user.id, 'shippingAddresses._id': addressId },
        { $set: { 'shippingAddresses.$': addressData } },
        { new: true }
      );
      break;
      
    case 'delete':
      user = await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { shippingAddresses: { _id: addressId } } },
        { new: true }
      );
      break;
      
    case 'set-default':
      // First reset all addresses to non-default
      await User.findByIdAndUpdate(
        req.user.id,
        { $set: { 'shippingAddresses.$[].isDefault': false } }
      );
      
      // Then set the specified address as default
      user = await User.findOneAndUpdate(
        { _id: req.user.id, 'shippingAddresses._id': addressId },
        { $set: { 'shippingAddresses.$.isDefault': true } },
        { new: true }
      );
      break;
      
    default:
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action'
      });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.manageWishlist = catchAsync(async (req, res, next) => {
  const { productId, action } = req.body;
  
  let update;
  
  if (action === 'add') {
    update = { $addToSet: { wishlist: productId } };
  } else if (action === 'remove') {
    update = { $pull: { wishlist: productId } };
  } else {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid action'
    });
  }
  
  const user = await User.findByIdAndUpdate(
    req.user.id,
    update,
    { new: true }
  ).populate('wishlist');
  
  res.status(200).json({
    status: 'success',
    data: {
      wishlist: user.wishlist
    }
  });
});

exports.followUser = catchAsync(async (req, res, next) => {
  const { userId, action } = req.body;
  
  if (userId === req.user.id) {
    return res.status(400).json({
      status: 'error',
      message: 'You cannot follow yourself'
    });
  }
  
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }
  
  let currentUserUpdate;
  let targetUserUpdate;
  
  if (action === 'follow') {
    currentUserUpdate = { $addToSet: { following: userId } };
    targetUserUpdate = { $addToSet: { followers: req.user.id } };
  } else if (action === 'unfollow') {
    currentUserUpdate = { $pull: { following: userId } };
    targetUserUpdate = { $pull: { followers: req.user.id } };
  } else {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid action'
    });
  }
  
  await User.findByIdAndUpdate(req.user.id, currentUserUpdate);
  await User.findByIdAndUpdate(userId, targetUserUpdate);
  
  // Send notification for follow action
  if (action === 'follow') {
    await Notification.create({
      user: userId,
      type: 'new_follower',
      title: 'New Follower',
      message: `${req.user.profile.firstName} ${req.user.profile.lastName} started following you.`,
      data: {
        followerId: req.user.id
      }
    });
  }
  
  res.status(200).json({
    status: 'success',
    message: `User ${action}ed successfully`
  });
});



// Update the getNotifications method:
exports.getNotifications = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, unreadOnly = false } = req.query;
  
  const result = await NotificationService.getUserNotifications(req.user.id, {
    page: parseInt(page),
    limit: parseInt(limit),
    unreadOnly: unreadOnly === 'true'
  });
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

// Update the markNotificationsAsRead method:
exports.markNotificationsAsRead = catchAsync(async (req, res, next) => {
  const { notificationIds } = req.body;
  
  await NotificationService.markAsRead(req.user.id, notificationIds);
  
  res.status(200).json({
    status: 'success',
    message: 'Notifications marked as read'
  });
});

// Update the deleteNotifications method:
exports.deleteNotifications = catchAsync(async (req, res, next) => {
  const { notificationIds } = req.body;
  
  await NotificationService.deleteNotifications(req.user.id, notificationIds);
  
  res.status(200).json({
    status: 'success',
    message: 'Notifications deleted successfully'
  });
});