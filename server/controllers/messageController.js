const Message = require('../models/Message');
const Order = require('../models/Order');
const catchAsync = require('../utils/catchAsync');

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { orderId, recipientId, content, attachments } = req.body;
  
  // Check if order exists and user is involved
  const order = await Order.findById(orderId);
  
  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }
  
  // Check if user is buyer or seller
  const isBuyer = order.buyer.toString() === req.user.id;
  const isSeller = order.seller.toString() === req.user.id;
  
  if (!isBuyer && !isSeller) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to message about this order'
    });
  }
  
  // Check if recipient is the other party
  const validRecipient = isBuyer ? order.seller.toString() : order.buyer.toString();
  if (recipientId !== validRecipient) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid recipient'
    });
  }
  
  // Check if messaging window is open (10 days after delivery)
  if (order.status === 'delivered') {
    const deliveryDate = new Date(order.shipping.deliveredAt);
    const messagingDeadline = new Date(deliveryDate.getTime() + 10 * 24 * 60 * 60 * 1000);
    
    if (new Date() > messagingDeadline) {
      return res.status(400).json({
        status: 'error',
        message: 'Messaging window has closed (10 days after delivery)'
      });
    }
  }
  
  const message = await Message.create({
    order: orderId,
    sender: req.user.id,
    recipient: recipientId,
    content,
    attachments: attachments || []
  });
  
  // Populate sender info for response
  await message.populate('sender', 'profile firstName lastName');
  
  res.status(201).json({
    status: 'success',
    data: {
      message
    }
  });
});

exports.getOrderMessages = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  // Check if order exists and user is involved
  const order = await Order.findById(orderId);
  
  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }
  
  // Check if user is buyer or seller
  const isBuyer = order.buyer.toString() === req.user.id;
  const isSeller = order.seller.toString() === req.user.id;
  
  if (!isBuyer && !isSeller) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to view messages for this order'
    });
  }
  
  const messages = await Message.find({ order: orderId })
    .populate('sender', 'profile firstName lastName')
    .populate('recipient', 'profile firstName lastName')
    .sort({ createdAt: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Message.countDocuments({ order: orderId });
  
  // Mark messages as read
  await Message.updateMany(
    { order: orderId, recipient: req.user.id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  
  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.getConversations = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  
  // Get all orders where user is involved
  const orders = await Order.find({
    $or: [{ buyer: req.user.id }, { seller: req.user.id }]
  }).select('_id');
  
  const orderIds = orders.map(order => order._id);
  
  // Get latest message from each conversation
  const conversations = await Message.aggregate([
    { $match: { order: { $in: orderIds } } },
    {
      $group: {
        _id: '$order',
        lastMessage: { $last: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$recipient', req.user.id] }, { $eq: ['$isRead', false] }] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit * 1 }
  ]);
  
  // Populate order and other user details
  const populatedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const order = await Order.findById(conv._id)
        .populate('buyer', 'profile firstName lastName')
        .populate('seller', 'profile firstName lastName');
      
      const otherUser = order.buyer._id.toString() === req.user.id ? 
        order.seller : order.buyer;
      
      return {
        order: conv._id,
        otherUser: {
          _id: otherUser._id,
          firstName: otherUser.profile.firstName,
          lastName: otherUser.profile.lastName,
          avatar: otherUser.profile.avatar
        },
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount
      };
    })
  );
  
  const total = await Message.distinct('order', { order: { $in: orderIds } });
  
  res.status(200).json({
    status: 'success',
    results: populatedConversations.length,
    data: {
      conversations: populatedConversations,
      totalPages: Math.ceil(total.length / limit),
      currentPage: page
    }
  });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  const { messageIds } = req.body;
  
  await Message.updateMany(
    { _id: { $in: messageIds }, recipient: req.user.id },
    { isRead: true, readAt: new Date() }
  );
  
  res.status(200).json({
    status: 'success',
    message: 'Messages marked as read'
  });
});