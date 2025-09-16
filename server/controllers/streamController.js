const Stream = require('../models/Stream');
const Product = require('../models/Product');
const IVSService = require('../services/ivsService');
const catchAsync = require('../utils/catchAsync');
const NotificationService = require('../services/notificationService');
exports.createStream = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    category,
    tags,
    scheduledStart,
    products,
    isChatEnabled,
    isRecording
  } = req.body;
  const io = req.app.get('io');
  // Create IVS channel
 
    const ivsChannel = await IVSService.createChannel(title);

  const stream = await Stream.create({
    title,
    description,
    thumbnail: req.file ? req.file.path : 'default-thumbnail.jpg',
    category,
    tags: tags ? tags.split(',') : [],
    seller: req.user.id,
    ivsChannelArn: ivsChannel.arn,
    ivsPlaybackUrl: ivsChannel.playbackUrl,
    ivsStreamKey: ivsChannel.streamKey, // This should work
    scheduledStart,
    products,
    isChatEnabled,
    isRecording
  });
  
  // Add products to stream
  if (products && products.length > 0) {
    await Product.updateMany(
      { _id: { $in: products } },
      { $addToSet: { streams: stream._id } }
    );
  }

   if (scheduledStart) {
    const seller = await req.user.populate('followers'); // assuming followers are populated
    const followerIds = seller.followers.map(f => f._id.toString());

    if (followerIds.length > 0) {
      await NotificationService.sendBulkNotifications(
        io,
        followerIds,
        'stream_starting',
        'Stream Starting Soon',
        `"${stream.title}" is starting soon. Don't miss it!`,
        { streamId: stream._id.toString() }
      );
    }
  }

  
  res.status(201).json({
    status: 'success',
    data: {
      stream
    }
  });
});

exports.getStream = catchAsync(async (req, res, next) => {
  const stream = await Stream.findById(req.params.id)
    .populate('seller', 'profile firstName lastName')
    .populate('products')
    .populate('currentProduct')
    .populate('moderators', 'profile firstName lastName')
    .populate('coHosts', 'profile firstName lastName');
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      stream
    }
  });
});

exports.getAllStreams = catchAsync(async (req, res, next) => {
  const {
    category,
    status,
    seller,
    page = 1,
    limit = 10,
    sort = '-createdAt'
  } = req.query;
  
  const filter = {};
  
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (seller) filter.seller = seller;
  
  const streams = await Stream.find(filter)
    .populate('seller', 'profile firstName lastName')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Stream.countDocuments(filter);
  
  res.status(200).json({
    status: 'success',
    results: streams.length,
    data: {
      streams,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.updateStream = catchAsync(async (req, res, next) => {
  const {
    title,
    description,
    category,
    tags,
    scheduledStart,
    products,
    currentProduct,
    isChatEnabled
  } = req.body;
  
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user is the stream owner
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to update this stream'
    });
  }
  
  const updatedStream = await Stream.findByIdAndUpdate(
    req.params.id,
    {
      title,
      description,
      category,
      tags: tags ? tags.split(',') : stream.tags,
      scheduledStart,
      products,
      currentProduct,
      isChatEnabled,
      ...(req.file && { thumbnail: req.file.path })
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      stream: updatedStream
    }
  });
});

exports.deleteStream = catchAsync(async (req, res, next) => {
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user is the stream owner
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to delete this stream'
    });
  }
  
  // Delete IVS channel
  await IVSService.deleteChannel(stream.ivsChannelArn);
  
  await Stream.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.startStream = catchAsync(async (req, res, next) => {
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user is the stream owner
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to start this stream'
    });
  }
  
  stream.status = 'live';
  stream.actualStart = new Date();
  await stream.save();

   if (followerIds.length > 0) {
    await NotificationService.sendBulkNotifications(
      io,
      followerIds,
      'stream_starting',
      'Stream is Live',
      `"${stream.title}" is live now. Join to watch!`,
      { streamId: stream._id.toString() }
    );
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      stream
    }
  });
});

exports.endStream = catchAsync(async (req, res, next) => {
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user is the stream owner
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to end this stream'
    });
  }
  
  stream.status = 'ended';
  stream.actualEnd = new Date();
  stream.duration = Math.round((stream.actualEnd - stream.actualStart) / 60000); // in minutes
  await stream.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      stream
    }
  });
});

exports.addViewer = catchAsync(async (req, res, next) => {
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user is already viewing
  const existingViewer = stream.viewers.find(
    viewer => viewer.user.toString() === req.user.id && !viewer.leftAt
  );
  
  if (existingViewer) {
    return res.status(200).json({
      status: 'success',
      message: 'User is already viewing the stream'
    });
  }
  
  // Add viewer
  stream.viewers.push({
    user: req.user.id,
    joinedAt: new Date()
  });
  
  stream.totalViewers += 1;
  
  // Update peak viewers if needed
  const currentViewers = stream.viewers.filter(viewer => !viewer.leftAt).length;
  if (currentViewers > stream.peakViewers) {
    stream.peakViewers = currentViewers;
  }
  
  await stream.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      stream
    }
  });
});

exports.removeViewer = catchAsync(async (req, res, next) => {
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Find and update viewer
  const viewerIndex = stream.viewers.findIndex(
    viewer => viewer.user.toString() === req.user.id && !viewer.leftAt
  );
  
  if (viewerIndex !== -1) {
    stream.viewers[viewerIndex].leftAt = new Date();
    await stream.save();
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      stream
    }
  });
});

exports.addModerator = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user is the stream owner
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to add moderators'
    });
  }
  
  // Check if user is already a moderator
  if (stream.moderators.includes(userId)) {
    return res.status(400).json({
      status: 'error',
      message: 'User is already a moderator'
    });
  }
  
  stream.moderators.push(userId);
  await stream.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      stream
    }
  });
});

exports.removeModerator = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user is the stream owner
  if (stream.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to remove moderators'
    });
  }
  
  stream.moderators = stream.moderators.filter(
    moderator => moderator.toString() !== userId
  );
  
  await stream.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      stream
    }
  });
});

exports.setCurrentProduct = catchAsync(async (req, res, next) => {
  const { productId } = req.body;
  const stream = await Stream.findById(req.params.id);
  
  if (!stream) {
    return res.status(404).json({
      status: 'error',
      message: 'Stream not found'
    });
  }
  
  // Check if user is the stream owner or moderator
  const isOwner = stream.seller.toString() === req.user.id;
  const isModerator = stream.moderators.includes(req.user.id);
  
  if (!isOwner && !isModerator && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to change the current product'
    });
  }
  
  // Check if product exists and belongs to the stream
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }
  
  if (!stream.products.includes(productId)) {
    return res.status(400).json({
      status: 'error',
      message: 'Product is not part of this stream'
    });
  }
  
  stream.currentProduct = productId;
  await stream.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      stream
    }
  });
});