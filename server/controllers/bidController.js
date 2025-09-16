const Bid = require('../models/Bid');
const Product = require('../models/Product');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const Order = require('../models/Order');
const catchAsync = require('../utils/catchAsync');

exports.placeBid = catchAsync(async (req, res, next) => {
  const { productId, amount, isAutoBid, maxAutoBid } = req.body;
   const io = req.app.get('io'); 

  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }
  
  // Check if product is available for bidding
  if (!product.auction.isAuction || product.auction.status !== 'active') {
    return res.status(400).json({
      status: 'error',
      message: 'Product is not available for bidding'
    });
  }
  
  // Check if auction has ended
  if (product.auction.endTime && product.auction.endTime < new Date()) {
    return res.status(400).json({
      status: 'error',
      message: 'Auction has ended'
    });
  }
  
  // Check if bid amount is valid
  const currentBid = product.auction.currentBid || product.auction.startingBid;
  const minBid = currentBid + product.auction.bidIncrement;
  
  if (amount < minBid) {
    return res.status(400).json({
      status: 'error',
      message: `Bid amount must be at least $${minBid}`
    });
  }
  
  // Check if user has enough balance (simplified)
  // In a real application, you would check payment methods or hold funds
  
  // Create bid
  const bid = await Bid.create({
    product: productId,
    buyer: req.user.id,
    amount,
    isAutoBid,
    maxAutoBid: isAutoBid ? maxAutoBid : undefined
  });
  
  // Update product current bid
  product.auction.currentBid = amount;
  
  // Check if there's a reserve price and if it's met
  if (product.auction.reservePrice && amount >= product.auction.reservePrice) {
    product.auction.reserveMet = true;
  }
  
  await product.save();
  
  // Notify previous highest bidder if exists
  const previousBid = await Bid.findOne({
    product: productId,
    status: 'active',
    buyer: { $ne: req.user.id }
  }).sort({ amount: -1 });
  
  if (previousBid) {
    previousBid.status = 'outbid';
    previousBid.outbidBy = req.user.id;
    await previousBid.save();
    
    // Send notification to previous bidder
    await NotificationService.sendOutbidNotification(
    io,
    previousBid.buyer,
    product,
    amount
  );
  }
  
  // Send notification to seller
 await NotificationService.sendNewBidNotification(
    io,
    product.seller,
    product,
    amount
  );
  
  res.status(201).json({
    status: 'success',
    data: {
      bid
    }
  });
});

exports.getProductBids = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const bids = await Bid.find({ product: productId })
    .populate('buyer', 'profile firstName lastName')
    .sort({ amount: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Bid.countDocuments({ product: productId });
  
  res.status(200).json({
    status: 'success',
    results: bids.length,
    data: {
      bids,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.getUserBids = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;
  
  const filter = { buyer: req.user.id };
  if (status) filter.status = status;
  
  const bids = await Bid.find(filter)
    .populate('product', 'name images auction')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Bid.countDocuments(filter);
  
  res.status(200).json({
    status: 'success',
    results: bids.length,
    data: {
      bids,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.cancelBid = catchAsync(async (req, res, next) => {
  const { bidId } = req.params;
  
  const bid = await Bid.findById(bidId);
  
  if (!bid) {
    return res.status(404).json({
      status: 'error',
      message: 'Bid not found'
    });
  }
  
  // Check if user is the bid owner
  if (bid.buyer.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to cancel this bid'
    });
  }
  
  // Check if bid can be cancelled (e.g., not the highest bid, auction not ended)
  const product = await Product.findById(bid.product);
  
  if (product.auction.currentBid === bid.amount) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot cancel the highest bid'
    });
  }
  
  if (product.auction.status === 'ended') {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot cancel bid after auction has ended'
    });
  }
  
  bid.status = 'cancelled';
  await bid.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      bid
    }
  });
});

exports.processAutoBids = catchAsync(async (productId, newBidAmount) => {
  const product = await Product.findById(productId);
  
  if (!product || !product.auction.isAuction || product.auction.status !== 'active') {
    return;
  }
  
  // Find auto bids that should respond to the new bid
  const autoBids = await Bid.find({
    product: productId,
    isAutoBid: true,
    status: 'active',
    maxAutoBid: { $gt: newBidAmount + product.auction.bidIncrement }
  }).sort({ maxAutoBid: -1, createdAt: 1 });
  
  for (const autoBid of autoBids) {
    const nextBidAmount = newBidAmount + product.auction.bidIncrement;
    
    if (nextBidAmount <= autoBid.maxAutoBid) {
      // Place auto bid
      const newAutoBid = await Bid.create({
        product: productId,
        buyer: autoBid.buyer,
        amount: nextBidAmount,
        isAutoBid: true,
        maxAutoBid: autoBid.maxAutoBid
      });
      
      // Update product current bid
      product.auction.currentBid = nextBidAmount;
      await product.save();
      
      // Notify previous bidder
      const previousBid = await Bid.findOne({
        product: productId,
        status: 'active',
        buyer: { $ne: autoBid.buyer }
      }).sort({ amount: -1 });
      
      if (previousBid) {
        previousBid.status = 'outbid';
        previousBid.outbidBy = autoBid.buyer;
        await previousBid.save();
        
        // Send notification to previous bidder
        await NotificationService.sendOutbidNotification(
          io,
          previousBid.buyer,
          product,
          nextBidAmount
        );
      }
      
      // Send notification to seller
       await NotificationService.sendNewBidNotification(
        io,
        product.seller,
        product,
        nextBidAmount
      );
      
      return; // Only one auto bid should respond at a time
    }
  }
});

exports.finalizeAuction = catchAsync(async (productId) => {
  const product = await Product.findById(productId);
  
  if (!product || !product.auction.isAuction || product.auction.status !== 'active') {
    return;
  }
  
  // Find winning bid
  const winningBid = await Bid.findOne({
    product: productId,
    status: 'active'
  }).sort({ amount: -1, createdAt: 1 });
  
  if (winningBid) {
    // Check if reserve price is met (if applicable)
    if (product.auction.reservePrice && winningBid.amount < product.auction.reservePrice) {
      // Reserve price not met, auction ends without winner
      product.auction.status = 'ended';
      product.status = 'active'; // Return to regular listing
      await product.save();
      
      // Notify seller and bidders
       await NotificationService.sendAuctionEndedNoWinnerNotification(io, product.seller, product);
      
      const bidders = await Bid.distinct('buyer', { product: productId });
     for (const bidderId of bidders) {
        await NotificationService.sendAuctionEndedNoWinnerNotification(io, bidderId, product);
      }
      
      return;
    }
    
    // Mark bid as winner
    winningBid.isWinner = true;
    winningBid.status = 'won';
    await winningBid.save();
    
    // Update product
    product.auction.status = 'ended';
    product.auction.winner = winningBid.buyer;
    product.status = 'sold';
    await product.save();
    
    // Create order
    const order = await Order.create({
      orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      buyer: winningBid.buyer,
      seller: product.seller,
      items: [{
        product: productId,
        quantity: 1,
        price: winningBid.amount
      }],
      totalAmount: winningBid.amount,
      payment: {
        method: 'card', // Assume card payment for auction wins
        status: 'pending'
      },
      status: 'pending'
    });
  

    await NotificationService.sendAuctionWonNotification(io, winningBid.buyer, product, winningBid.amount, order._id);
    await NotificationService.sendAuctionSoldNotification(io, product.seller, product, winningBid.amount, order._id);
    
    // Notify other bidders
    const otherBidders = await Bid.distinct('buyer', {
      product: productId,
      buyer: { $ne: winningBid.buyer }
    });
    
    for (const bidderId of otherBidders) {
      await NotificationService.sendAuctionLostNotification(io, bidderId, product, winningBid.amount);
    }
  } else {
    // No bids, auction ends without winner
    product.auction.status = 'ended';
    product.status = 'active'; // Return to regular listing
    await product.save();
    
    // Notify seller
    await NotificationService.sendAuctionEndedNoWinnerNotification(
      product.seller,
      product
    );
  }
});