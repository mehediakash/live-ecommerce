const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');

// Calculate trending score based on views, sales, and engagement
const calculateTrendingScore = (product) => {
  const viewsWeight = 0.3;
  const salesWeight = 0.4;
  const engagementWeight = 0.3;
  
  return (product.stats.views * viewsWeight) + 
         (product.stats.sales * salesWeight) + 
         (product.stats.engagement * engagementWeight);
};

// Update trending products (to be called periodically)
exports.updateTrendingProducts = catchAsync(async () => {
  const products = await Product.find({ status: 'active' });
  
  for (const product of products) {
    const trendingScore = calculateTrendingScore(product);
    const isTrending = trendingScore > 50; // Threshold for trending
    
    await Product.findByIdAndUpdate(product._id, {
      trendingScore,
      isTrending
    });
  }
  
  console.log('Trending products updated successfully');
});

// Get trending products
exports.getTrendingProducts = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, category } = req.query;
  
  const filter = { isTrending: true, status: 'active' };
  if (category) filter.category = category;
  
  const products = await Product.find(filter)
    .populate('seller', 'profile firstName lastName')
    .sort({ trendingScore: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Product.countDocuments(filter);
  
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

// Get popular categories based on trending products
exports.getTrendingCategories = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;
  
  const trendingCategories = await Product.aggregate([
    { $match: { isTrending: true, status: 'active' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        averageScore: { $avg: '$trendingScore' }
      }
    },
    { $sort: { count: -1, averageScore: -1 } },
    { $limit: parseInt(limit) }
  ]);
  
  res.status(200).json({
    status: 'success',
    results: trendingCategories.length,
    data: {
      categories: trendingCategories
    }
  });
});