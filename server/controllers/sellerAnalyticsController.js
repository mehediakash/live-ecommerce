const Order = require('../models/Order');
const Product = require('../models/Product');
const Stream = require('../models/Stream');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

exports.getSellerDashboard = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const [
    totalRevenue,
    totalOrders,
    activeProducts,
    totalStreams,
    viewerStats,
    conversionRate,
    topProducts
  ] = await Promise.all([
    // Total Revenue
    Order.aggregate([
      {
        $match: {
          seller: req.user._id,
          'payment.status': 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]),
    
    // Total Orders
    Order.countDocuments({
      seller: req.user._id,
      ...dateFilter
    }),
    
    // Active Products
    Product.countDocuments({
      seller: req.user._id,
      status: 'active'
    }),
    
    // Total Streams
    Stream.countDocuments({
      seller: req.user._id,
      ...dateFilter
    }),
    
    // Viewer Statistics
    Stream.aggregate([
      {
        $match: {
          seller: req.user._id,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalViewers: { $sum: '$totalViewers' },
          avgViewers: { $avg: '$peakViewers' },
          maxViewers: { $max: '$peakViewers' }
        }
      }
    ]),
    
    // Conversion Rate
    Order.aggregate([
      {
        $match: {
          seller: req.user._id,
          'payment.status': 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalViewers: {
            $sum: {
              $add: ['$totalViewers', 0]
            }
          }
        }
      }
    ]),
    
    // Top Products
    Order.aggregate([
      {
        $match: {
          seller: req.user._id,
          'payment.status': 'completed',
          ...dateFilter
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.product',
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      }
    ])
  ]);

  const dashboardData = {
    revenue: totalRevenue[0]?.total || 0,
    orders: totalOrders,
    products: activeProducts,
    streams: totalStreams,
    viewers: {
      total: viewerStats[0]?.totalViewers || 0,
      average: viewerStats[0]?.avgViewers || 0,
      peak: viewerStats[0]?.maxViewers || 0
    },
    conversion: conversionRate[0] ? 
      (conversionRate[0].totalSales / conversionRate[0].totalViewers) * 100 : 0,
    topProducts: topProducts.map(item => ({
      product: item.product.name,
      sales: item.totalSales,
      revenue: item.totalRevenue
    }))
  };

  res.status(200).json({
    status: 'success',
    data: dashboardData
  });
});

exports.getSalesReport = catchAsync(async (req, res, next) => {
  const { period = 'monthly', startDate, endDate } = req.query;
  
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const salesReport = await Order.aggregate([
    {
      $match: {
        seller: req.user._id,
        'payment.status': 'completed',
        ...dateFilter
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: period === 'daily' ? '%Y-%m-%d' : '%Y-%m',
            date: '$createdAt'
          }
        },
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        uniqueCustomers: { $addToSet: '$buyer' }
      }
    },
    {
      $project: {
        date: '$_id',
        totalSales: 1,
        totalRevenue: 1,
        averageOrderValue: 1,
        uniqueCustomers: { $size: '$uniqueCustomers' }
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: salesReport
  });
});

exports.getProductPerformance = catchAsync(async (req, res, next) => {
  const { productId, startDate, endDate } = req.query;
  
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const productFilter = productId ? { _id: productId } : { seller: req.user._id };

  const productPerformance = await Product.aggregate([
    {
      $match: productFilter
    },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'items.product',
        as: 'orders',
        pipeline: [
          {
            $match: {
              'payment.status': 'completed',
              ...dateFilter
            }
          }
        ]
      }
    },
    {
      $project: {
        name: 1,
        price: 1,
        images: 1,
        totalSales: {
          $reduce: {
            input: '$orders',
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$$this.items',
                          as: 'item',
                          cond: { $eq: ['$$item.product', '$_id'] }
                        }
                      },
                      as: 'matchedItem',
                      in: '$$matchedItem.quantity'
                    }
                  }
                }
              ]
            }
          }
        },
        totalRevenue: {
          $reduce: {
            input: '$orders',
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$$this.items',
                          as: 'item',
                          cond: { $eq: ['$$item.product', '$_id'] }
                        }
                      },
                      as: 'matchedItem',
                      in: { $multiply: ['$$matchedItem.quantity', '$$matchedItem.price'] }
                    }
                  }
                }
              ]
            }
          }
        },
        conversionRate: {
          $cond: [
            { $gt: ['$stats.views', 0] },
            { $multiply: [{ $divide: ['$stats.sales', '$stats.views'] }, 100] },
            0
          ]
        }
      }
    },
    {
      $sort: { totalRevenue: -1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: productPerformance
  });
});

exports.getStreamAnalytics = catchAsync(async (req, res, next) => {
  const { streamId, startDate, endDate } = req.query;
  
  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const streamFilter = streamId ? 
    { _id: streamId, seller: req.user._id } : 
    { seller: req.user._id, ...dateFilter };

  const streamAnalytics = await Stream.aggregate([
    {
      $match: streamFilter
    },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'stream',
        as: 'orders'
      }
    },
    {
      $project: {
        title: 1,
        scheduledStart: 1,
        actualStart: 1,
        duration: 1,
        totalViewers: 1,
        peakViewers: 1,
        products: 1,
        orders: {
          $filter: {
            input: '$orders',
            as: 'order',
            cond: { $eq: ['$$order.payment.status', 'completed'] }
          }
        },
        salesConversion: {
          $cond: [
            { $gt: ['$totalViewers', 0] },
            { $multiply: [{ $divide: [{ $size: '$orders' }, '$totalViewers'] }, 100] },
            0
          ]
        }
      }
    },
    {
      $sort: { actualStart: -1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: streamAnalytics
  });
});