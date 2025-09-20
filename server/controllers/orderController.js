const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const ShippingProfile = require('../models/ShippingProfile');
const NotificationService = require('../services/notificationService');
const PaymentService = require('../services/paymentService');
const CarrierService = require('../services/carrierService');
const TaxService = require('../services/taxService');
const catchAsync = require('../utils/catchAsync');

exports.createOrder = catchAsync(async (req, res, next) => {
  const {
    items,
    shippingAddress,
    paymentMethodId,
    useSavedAddress,
    saveAddress,
    couponCode,
    shippingProfileId,
    shippingOptionId,
    rushOrder,
    specialInstructions,
    insurance
  } = req.body;
  
  const io = req.app.get('io'); // Get Socket.io instance

  // Validate items
  let totalAmount = 0;
  const orderItems = [];
  let sellerId = null;
  
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
    
    // Set seller ID (assuming single seller per order)
    if (!sellerId) {
      sellerId = product.seller;
    } else if (sellerId.toString() !== product.seller.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot order products from multiple sellers in one order'
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
  
  // Handle shipping
  let shippingCost = 0;
  let selectedShippingOption = null;
  let shippingProfile = null;

  if (shippingProfileId && shippingOptionId) {
    shippingProfile = await ShippingProfile.findOne({
      _id: shippingProfileId,
      seller: sellerId
    });

    if (shippingProfile) {
      selectedShippingOption = shippingProfile.shippingOptions.id(shippingOptionId);
      
      if (selectedShippingOption) {
        shippingCost = selectedShippingOption.cost;
        
        // Apply free shipping threshold
        if (selectedShippingOption.freeShippingThreshold && 
            totalAmount >= selectedShippingOption.freeShippingThreshold) {
          shippingCost = 0;
        }
      }
    }
  }

  // Apply rush order fee if requested
  let rushFee = 0;
  if (rushOrder && rushOrder.isRush) {
    rushFee = rushOrder.rushFee || totalAmount * 0.2; // 20% rush fee by default
  }

  // Apply insurance cost if requested
  let insuranceCost = 0;
  let insuredValue = 0;
  if (insurance && insurance.isInsured) {
    insuredValue = totalAmount;
    insuranceCost = insuredValue * 0.01; // 1% insurance cost
  }

  // Calculate subtotal (before discounts, shipping, fees)
  const subtotal = totalAmount;

  // Apply coupon discount if provided
  let discountAmount = 0;
  if (couponCode) {
    discountAmount = totalAmount * 0.1; // 10% discount for example
    totalAmount -= discountAmount;
  }

  // Add shipping cost, rush fee, and insurance
  totalAmount += shippingCost + rushFee + insuranceCost;

  // Calculate tax
  const taxInfo = await TaxService.calculateTax(
    { totalAmount: subtotal }, // Pass order without shipping/fees for tax calculation
    shippingAddress
  );

  // Add tax to total
  totalAmount += taxInfo.amount;

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
  const orderData = {
    orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    buyer: req.user.id,
    seller: sellerId,
    items: orderItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    shippingAddress: finalShippingAddress,
    payment: {
      method: 'card',
      status: 'pending'
    },
    discount: {
      code: couponCode,
      amount: parseFloat(discountAmount.toFixed(2))
    },
    tax: {
      rate: taxInfo.rate,
      amount: parseFloat(taxInfo.amount.toFixed(2)),
      country: taxInfo.country,
      region: taxInfo.region
    },
    shippingProfile: shippingProfileId,
    shippingOption: selectedShippingOption ? selectedShippingOption.toObject() : undefined,
    specialInstructions,
    rushOrder: rushOrder ? {
      isRush: rushOrder.isRush,
      rushFee: parseFloat(rushFee.toFixed(2)),
      promisedDate: rushOrder.promisedDate
    } : undefined,
    fulfillment: {
      insurance: {
        isInsured: insurance ? insurance.isInsured : false,
        insuranceCost: parseFloat(insuranceCost.toFixed(2)),
        insuredValue: parseFloat(insuredValue.toFixed(2))
      }
    }
  };

  // Add international fields if applicable
  if (finalShippingAddress.country !== 'GB') {
    orderData.international = {
      isInternational: true,
      customsValue: subtotal,
      customsDescription: orderItems.map(item => item.product.name).join(', ')
    };
  }

  const order = await Order.create(orderData);

  // **Stripe Customer creation logic merge করা হলো এখানে**
  let stripeCustomerId = req.user.stripeCustomerId;

  if (!stripeCustomerId) {
    // 1. Stripe Customer create করো
    const customer = await PaymentService.createStripeCustomer({
        email: req.user.email,
        name: req.user.profile.firstName + ' ' + req.user.profile.lastName
    });

    // 2. User model update করো
    await User.findByIdAndUpdate(req.user.id, { stripeCustomerId: customer.id });

    stripeCustomerId = customer.id; // update local variable
  }
  
  // Process payment
  try {
    const paymentResult = await PaymentService.processPayment({
      amount: totalAmount,
      paymentMethodId,
      customerId: stripeCustomerId,
      orderId: order.orderId
    });
    
    order.payment.status = 'completed';
    order.payment.transactionId = paymentResult.id;
    order.payment.paidAt = new Date();
    order.status = 'confirmed';
    
    await order.save();
    
    // Send confirmation notification
    await NotificationService.sendOrderConfirmationNotification(io, req.user.id, order);
    
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
      if (product) {
        product.inventory.reservedQuantity -= item.quantity;
        await product.save();
      }
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
    .populate('items.product', 'name images')
    .populate('shippingProfile');
  
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
  const io = req.app.get('io');
  
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
    order.fulfillment.trackingNumber = trackingNumber;
    order.fulfillment.carrier = carrier;
    order.fulfillment.shippedAt = new Date();
    
    // Calculate estimated delivery based on carrier
    const shippingTimes = {
      'royal_mail': { standard: 5, expedited: 2, overnight: 1 },
      'dpd': { standard: 3, expedited: 2, overnight: 1 },
      'ups': { standard: 4, expedited: 2, overnight: 1 },
      'fedex': { standard: 3, expedited: 2, overnight: 1 }
    };
    
    const carrierTime = shippingTimes[carrier] || shippingTimes.royal_mail;
    const shippingType = order.shippingOption?.type || 'standard';
    const days = carrierTime[shippingType] || 5;
    
    order.fulfillment.estimatedDelivery = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    
    // Generate shipping label through carrier service
    try {
      const labelData = await CarrierService.createShipment(order, order.shippingOption);
      order.fulfillment.labelUrl = labelData.labelUrl;
    } catch (error) {
      console.error('Failed to generate shipping label:', error);
      // Continue without label URL
    }
    
    // Send shipment notification
    await NotificationService.sendOrderShippedNotification(io, order.buyer, order, trackingNumber);
  }
  
  if (status === 'delivered') {
    order.fulfillment.actualDelivery = new Date();
    
    // Update product sold quantities and release reserved inventory
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.inventory.soldQuantity += item.quantity;
        product.inventory.reservedQuantity -= item.quantity;
        product.stats.sales += 1;
        await product.save();
      }
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
  
  // Check return policy
  const shippingProfile = await ShippingProfile.findById(order.shippingProfile);
  const returnPeriod = shippingProfile?.returnPolicy?.returnPeriod || 30;
  
  const deliveryDate = new Date(order.fulfillment.actualDelivery || order.fulfillment.shippedAt);
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
      amount: refundAmount || (order.totalAmount - (order.tax?.amount || 0)) // Refund without tax
    });
    
    order.refundAmount = refundAmount || (order.totalAmount - (order.tax?.amount || 0));
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

// New method to get shipping options for order
exports.getShippingOptions = catchAsync(async (req, res, next) => {
  const { items, shippingAddress } = req.body;
  
  if (!items || !items.length || !shippingAddress) {
    return res.status(400).json({
      status: 'error',
      message: 'Items and shipping address are required'
    });
  }
  
  // Get seller ID from first product
  const firstProduct = await Product.findById(items[0].productId);
  if (!firstProduct) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }
  
  const sellerId = firstProduct.seller;
  
  // Calculate order total for free shipping thresholds
  let orderTotal = 0;
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (product) {
      orderTotal += product.price * item.quantity;
    }
  }
  
  // Get available shipping profiles for this seller
  const shippingProfiles = await ShippingProfile.find({ seller: sellerId });
  
  const availableOptions = [];
  
  for (const profile of shippingProfiles) {
    for (const option of profile.shippingOptions) {
      // Check if option is available for destination
      if (option.countries && option.countries.length > 0 && 
          !option.countries.includes(shippingAddress.country)) {
        continue;
      }
      
      // Check if international shipping is required
      if (shippingAddress.country !== 'GB' && option.type !== 'international') {
        continue;
      }
      
      let cost = option.cost;
      
      // Apply free shipping threshold
      if (option.freeShippingThreshold && orderTotal >= option.freeShippingThreshold) {
        cost = 0;
      }
      
      availableOptions.push({
        profileId: profile._id,
        optionId: option._id,
        name: option.name,
        type: option.type,
        carrier: option.carrier,
        cost: parseFloat(cost.toFixed(2)),
        estimatedDelivery: option.estimatedDelivery,
        freeShippingThreshold: option.freeShippingThreshold
      });
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      shippingOptions: availableOptions
    }
  });
});