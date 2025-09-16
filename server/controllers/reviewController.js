const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');

exports.createReview = catchAsync(async (req, res, next) => {
  const { orderId, rating, title, comment, images } = req.body;
  
  // Check if order exists and belongs to user
  const order = await Order.findOne({
    _id: orderId,
    buyer: req.user.id,
    status: 'delivered'
  });
  
  if (!order) {
    return res.status(404).json({
      status: 'error',
      message: 'Order not found or not eligible for review'
    });
  }
  
  // Check if review already exists for this order
  const existingReview = await Review.findOne({ order: orderId });
  if (existingReview) {
    return res.status(400).json({
      status: 'error',
      message: 'Review already exists for this order'
    });
  }
  
  // Check if all products in order are from the same seller
  const productIds = order.items.map(item => item.product);
  const products = await Product.find({ _id: { $in: productIds } });
  
  const sellers = [...new Set(products.map(p => p.seller.toString()))];
  if (sellers.length !== 1) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot review order with products from multiple sellers'
    });
  }
  
  const reviewData = {
    product: productIds[0], // For simplicity, review the first product
    order: orderId,
    buyer: req.user.id,
    seller: sellers[0],
    rating,
    title,
    comment,
    images: images || [],
    isVerifiedPurchase: true
  };
  
  const review = await Review.create(reviewData);
  
  // Update product rating
  await updateProductRating(review.product);
  
  res.status(201).json({
    status: 'success',
    data: {
      review
    }
  });
});

exports.getProductReviews = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, rating, sort = '-createdAt' } = req.query;
  
  const filter = { product: productId, status: 'approved' };
  
  if (rating) {
    filter.rating = Number(rating);
  }
  
  const reviews = await Review.find(filter)
    .populate('buyer', 'profile firstName lastName')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Review.countDocuments(filter);
  
  // Get rating distribution
  const ratingDistribution = await Review.aggregate([
    { $match: { product: mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);
  
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      ratingDistribution
    }
  });
});

exports.getSellerReviews = catchAsync(async (req, res, next) => {
  const { sellerId } = req.params;
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  
  const reviews = await Review.find({ seller: sellerId, status: 'approved' })
    .populate('buyer', 'profile firstName lastName')
    .populate('product', 'name images')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Review.countDocuments({ seller: sellerId, status: 'approved' });
  
  // Calculate average rating
  const avgRating = await Review.aggregate([
    { $match: { seller: mongoose.Types.ObjectId(sellerId), status: 'approved' } },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
      averageRating: avgRating[0]?.average || 0,
      totalReviews: avgRating[0]?.count || 0,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.helpfulReview = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  
  const review = await Review.findById(reviewId);
  
  if (!review) {
    return res.status(404).json({
      status: 'error',
      message: 'Review not found'
    });
  }
  
  // Check if user already marked this review as helpful
  if (review.helpful.includes(req.user.id)) {
    return res.status(400).json({
      status: 'error',
      message: 'You already marked this review as helpful'
    });
  }
  
  review.helpful.push(req.user.id);
  review.helpfulCount += 1;
  await review.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

exports.addResponse = catchAsync(async (req, res, next) => {
  const { reviewId } = req.params;
  const { response } = req.body;
  
  const review = await Review.findById(reviewId);
  
  if (!review) {
    return res.status(404).json({
      status: 'error',
      message: 'Review not found'
    });
  }
  
  // Check if user is the seller
  if (review.seller.toString() !== req.user.id) {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to respond to this review'
    });
  }
  
  review.response = {
    comment: response,
    respondedAt: new Date()
  };
  
  await review.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

// Helper function to update product rating
async function updateProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: '$product',
        average: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      'rating.average': stats[0].average,
      'rating.count': stats[0].count
    });
  }
}