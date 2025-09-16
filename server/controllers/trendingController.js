const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');

exports.getTrendingProducts = catchAsync(async (req, res, next) => {
  const { limit = 10, timeframe = 'week' } = req.query;
  
  let dateFilter = {};
  const now = new Date();
  
  switch (timeframe) {
    case 'day':
      dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 1)) } };
      break;
    case 'week':
      dateFilter = { createdAt: { $gte: new Date(now.setDate(now.getDate() - 7)) } };
      break;
    case 'month':
      dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) } };
      break;
  }
  
  const trendingProducts = await Product.aggregate([
    { $match: { status: 'active', ...dateFilter } },
    {
      $addFields: {
        trendingScore: {
          $add: [
            { $multiply: ['$stats.views', 0.3] },
            { $multiply: ['$stats.wishlists', 0.4] },
            { $multiply: ['$stats.sales', 1.5] },
            { $multiply: ['$stats.engagement', 0.8] }
          ]
        }
      }
    },
    { $sort: { trendingScore: -1 } },
    { $limit: parseInt(limit) },
    {
      $lookup: {
        from: 'users',
        localField: 'seller',
        foreignField: '_id',
        as: 'seller'
      }
    },
    { $unwind: '$seller' }
  ]);
  
  res.status(200).json({
    status: 'success',
    results: trendingProducts.length,
    data: {
      products: trendingProducts
    }
  });
});

exports.updateProductEngagement = catchAsync(async (req, res, next) => {
  const { productId, action } = req.body;
  
  const updateMap = {
    view: { 'stats.views': 1, 'stats.engagement': 2 },
    wishlist: { 'stats.wishlists': 1, 'stats.engagement': 3 },
    purchase: { 'stats.sales': 1, 'stats.engagement': 5 },
    share: { 'stats.engagement': 2 },
    comment: { 'stats.engagement': 1 }
  };
  
  if (!updateMap[action]) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid action'
    });
  }
  
  const update = {};
  Object.entries(updateMap[action]).forEach(([key, value]) => {
    update[key] = value;
  });
  
  await Product.findByIdAndUpdate(productId, { $inc: update });
  
  res.status(200).json({
    status: 'success',
    message: 'Product engagement updated'
  });
});