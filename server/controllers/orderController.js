const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const PaymentService = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');

exports.createOrder = catchAsync(async (req, res, next) => {
  const {
    items,
    shippingAddress,
    paymentMethodId,
    useSavedAddress,
    saveAddress,
    couponCode
  } = req.body;
  const io = req.app.get('io'); // Get Socket.io instance

  // Validate items
  let totalAmount = 0;
  const orderItems = [];
  
  for (const item of items) {
    const product = await Product.findById(item.productId);
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: `Product not found: ${item.productId}`
      });
    }
    
    if (product.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: `Product is not available: ${product.name}`
      });
    }
    
    if (product.inventory.totalQuantity - product.inventory.reservedQuantity < item.quantity) {
      return res.status(400).json({
        status: 'error',
        message: `Insufficient stock for: ${product.name}`
      });
    }
    
    let itemPrice = product.price;
    
    // Check if it's an auction win
    if (product.auction.isAuction && product.auction.status === 'ended' && product.auction.winner.toString() === req.user.id) {
      itemPrice = product.auction.currentBid;
    }
    
    // Check variations if provided
    if (item.variation) {
      const variation = product.variations.find(v => v._id.toString() === item.variation);
      if (variation && variation.price) {
        itemPrice = variation.price;
      }
    }
    
    totalAmount += itemPrice * item.quantity;
    
    orderItems.push({
      product: product._id,
      quantity: item.quantity,
      price: itemPrice,
      variation: item.variation || null
    });
    
    // Reserve inventory
    product.inventory.reservedQuantity += item.quantity;
    await product.save();
  }
  
  // Apply coupon discount if provided
  let discountAmount = 0;
  if (couponCode) {
    // In a real application, you would validate the coupon code
    // and calculate discount based on coupon rules
    discountAmount = totalAmount * 0.1; // 10% discount for example
    totalAmount -= discountAmount;
  }
  
  // Handle shipping address
  let finalShippingAddress;
  
  if (useSavedAddress) {
    const user = await User.findById(req.user.id);
    const address = user.shippingAddresses.id(useSavedAddress);
    
    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Saved address not found'
      });
    }
    
    finalShippingAddress = address.toObject();
    delete finalShippingAddress._id;
  } else {
    finalShippingAddress = shippingAddress;
  }
  
  // Save address if requested
  if (saveAddress && !useSavedAddress) {
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { shippingAddresses: finalShippingAddress } }
    );
  }
  
  // Create order
  const order = await Order.create({
    orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    buyer: req.user.id,
    seller: orderItems[0].product.seller, // Assuming single seller for simplicity
    items: orderItems,
    totalAmount,
    shippingAddress: finalShippingAddress,
    payment: {
      method: 'card',
      status: 'pending'
    },
    discount: {
      code: couponCode,
      amount: discountAmount
    }
  });
  
  // Process payment
  try {
    const paymentResult = await PaymentService.processPayment({
      amount: totalAmount,
      paymentMethodId,
      customerId: req.user.stripeCustomerId,
      orderId: order.orderId
    });
    
    order.payment.status = 'completed';
    order.payment.transactionId = paymentResult.id;
    order.payment.paidAt = new Date();
    order.status = 'confirmed';
    
    await order.save();
    
    // Send confirmation notification
    await NotificationService.sendOrderConfirmationNotification(io, req.user.id, order);
    // await NotificationService.sendOrderConfirmationNotification(req.user.id, order);
    
    res.status(201).json({
      status: 'success',
      data: {
        order,
        payment: paymentResult
      }
    });
  } catch (error) {
    // Payment failed, release reserved inventory
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      product.inventory.reservedQuantity -= item.quantity;
      await product.save();
    }
    
    order.payment.status = 'failed';
    await order.save();
    
    return res.status(400).json({
      status: 'error',
      message: 'Payment failed: ' + error.message
    });
  }
});

exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('buyer', 'profile firstName lastName')
    .populate('seller', 'profile firstName lastName')
    .populate('items.product', 'name images');
  
  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }
  
  // Check if user is the buyer or seller
  if (order.buyer._id.toString() !== req.user.id && 
      order.seller._id.toString() !== req.user.id && 
      req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to view this order'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.getUserOrders = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 10, role = 'buyer' } = req.query;
  
  const filter = {};
  
  if (role === 'buyer') {
    filter.buyer = req.user.id;
  } else if (role === 'seller') {
    filter.seller = req.user.id;
  } else {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid role parameter'
    });
  }
  
  if (status) filter.status = status;
  
  const orders = await Order.find(filter)
    .populate(role === 'buyer' ? 'seller' : 'buyer', 'profile firstName lastName')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Order.countDocuments(filter);
  
  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, trackingNumber, carrier } = req.body;
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }
  
  // Check if user is the seller or admin
  if (order.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to update this order'
    });
  }
  
  const previousStatus = order.status;
  order.status = status;
  
  if (status === 'shipped' && trackingNumber && carrier) {
    order.shipping.trackingNumber = trackingNumber;
    order.shipping.carrier = carrier;
    order.shipping.shippedAt = new Date();
    
    // Calculate estimated delivery
    const shippingTime = carrier === 'overnight' ? 1 : carrier === 'expedited' ? 2 : 5;
    order.shipping.estimatedDelivery = new Date(Date.now() + shippingTime * 24 * 60 * 60 * 1000);
    
    // Send shipment notification
    // await NotificationService.sendOrderShippedNotification(order.buyer, order, trackingNumber);
     await NotificationService.sendOrderShippedNotification(io, order.buyer, order, trackingNumber);
  }
  
  if (status === 'delivered') {
    order.shipping.deliveredAt = new Date();
    
    // Update product sold quantities and release reserved inventory
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      product.inventory.soldQuantity += item.quantity;
      product.inventory.reservedQuantity -= item.quantity;
      product.stats.sales += 1;
      await product.save();
    }
  }
  
  await order.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.requestReturn = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }
  
  // Check if user is the buyer
  if (order.buyer.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to request return for this order'
    });
  }
  
  // Check if order is eligible for return
  if (order.status !== 'delivered') {
    return res.status(400).json({
      status: 'error',
      message: 'Only delivered orders can be returned'
    });
  }
  
  const deliveryDate = new Date(order.shipping.deliveredAt);
  const returnPeriod = 30; // 30-day return policy
  const returnDeadline = new Date(deliveryDate.getTime() + returnPeriod * 24 * 60 * 60 * 1000);
  
  if (new Date() > returnDeadline) {
    return res.status(400).json({
      status: 'error',
      message: 'Return period has expired'
    });
  }
  
  order.status = 'returned';
  order.returnReason = reason;
  order.returnRequestedAt = new Date();
  
  await order.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.processRefund = catchAsync(async (req, res, next) => {
  const { refundAmount } = req.body;
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found'
    });
  }
  
  // Check if user is the seller or admin
  if (order.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to process refund for this order'
    });
  }
  
  if (order.status !== 'returned') {
    return res.status(400).json({
      status: 'error',
      message: 'Only returned orders can be refunded'
    });
  }
  
  try {
    const refundResult = await PaymentService.processRefund({
      paymentIntentId: order.payment.transactionId,
      amount: refundAmount || order.totalAmount
    });
    
    order.refundAmount = refundAmount || order.totalAmount;
    order.payment.status = 'refunded';
    await order.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        order,
        refund: refundResult
      }
    });
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Refund failed: ' + error.message
    });
  }
});