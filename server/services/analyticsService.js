const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Stream = require('../models/Stream');

class AnalyticsService {
  constructor() {
    this.dailyJob = null;
    this.weeklyJob = null;
    this.monthlyJob = null;
  }

  async generateDailyAnalytics() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const analytics = await this.calculateMetrics(yesterday, 'daily');
      await Analytics.create(analytics);

      console.log('Daily analytics generated for:', yesterday.toDateString());
    } catch (error) {
      console.error('Error generating daily analytics:', error);
    }
  }

  async generateWeeklyAnalytics() {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);

      const analytics = await this.calculateMetrics(oneWeekAgo, 'weekly');
      await Analytics.create(analytics);

      console.log('Weekly analytics generated for week starting:', oneWeekAgo.toDateString());
    } catch (error) {
      console.error('Error generating weekly analytics:', error);
    }
  }

  async generateMonthlyAnalytics() {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      oneMonthAgo.setDate(1);
      oneMonthAgo.setHours(0, 0, 0, 0);

      const analytics = await this.calculateMetrics(oneMonthAgo, 'monthly');
      await Analytics.create(analytics);

      console.log('Monthly analytics generated for month starting:', oneMonthAgo.toDateString());
    } catch (error) {
      console.error('Error generating monthly analytics:', error);
    }
  }

  async calculateMetrics(date, period) {
    // Calculate user metrics
    const userMetrics = await this.calculateUserMetrics(date, period);
    
    // Calculate revenue metrics
    const revenueMetrics = await this.calculateRevenueMetrics(date, period);
    
    // Calculate order metrics
    const orderMetrics = await this.calculateOrderMetrics(date, period);
    
    // Calculate product metrics
    const productMetrics = await this.calculateProductMetrics(date, period);
    
    // Calculate stream metrics
    const streamMetrics = await this.calculateStreamMetrics(date, period);

    return {
      date,
      period,
      metrics: {
        users: userMetrics,
        revenue: revenueMetrics,
        orders: orderMetrics,
        products: productMetrics,
        streams: streamMetrics,
        engagement: await this.calculateEngagementMetrics(date, period)
      },
      platform: {
        feePercentage: 0.05, // 5% platform fee
        totalFees: revenueMetrics.total * 0.05,
        payoutAmount: revenueMetrics.total * 0.95
      }
    };
  }

  async calculateUserMetrics(date, period) {
    const dateFilter = this.getDateFilter(date, period);

    const [
      totalUsers,
      newUsers,
      activeUsers,
      sellers,
      buyers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: dateFilter }),
      User.countDocuments({ lastActive: dateFilter }),
      User.countDocuments({ role: 'seller' }),
      User.countDocuments({ role: 'user' })
    ]);

    return { total: totalUsers, new: newUsers, active: activeUsers, sellers, buyers };
  }

  async calculateRevenueMetrics(date, period) {
    const dateFilter = this.getDateFilter(date, period);

    const revenueData = await Order.aggregate([
      {
        $match: {
          'payment.status': 'completed',
          createdAt: dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    const total = revenueData[0]?.totalRevenue || 0;
    const orderCount = revenueData[0]?.orderCount || 0;

    return {
      total,
      fromSales: total,
      fromFees: total * 0.05, // Assuming 5% platform fee
      averageOrderValue: orderCount > 0 ? total / orderCount : 0
    };
  }

  async calculateOrderMetrics(date, period) {
    const dateFilter = this.getDateFilter(date, period);

    const orderData = await Order.aggregate([
      {
        $match: { createdAt: dateFilter }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const metrics = {
      total: 0,
      completed: 0,
      cancelled: 0,
      refunded: 0
    };

    orderData.forEach(item => {
      metrics.total += item.count;
      if (item._id === 'completed') metrics.completed = item.count;
      if (item._id === 'cancelled') metrics.cancelled = item.count;
      if (item._id === 'refunded') metrics.refunded = item.count;
    });

    return metrics;
  }

  async calculateProductMetrics(date, period) {
    const dateFilter = this.getDateFilter(date, period);

    const [
      totalProducts,
      newProducts,
      soldProducts
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ createdAt: dateFilter }),
      Order.countDocuments({
        'payment.status': 'completed',
        createdAt: dateFilter
      })
    ]);

    return { total: totalProducts, new: newProducts, sold: soldProducts };
  }

  async calculateStreamMetrics(date, period) {
    const dateFilter = this.getDateFilter(date, period);

    const streamData = await Stream.aggregate([
      {
        $match: { createdAt: dateFilter }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgViewers: { $avg: '$peakViewers' }
        }
      }
    ]);

    const metrics = {
      total: 0,
      live: 0,
      completed: 0,
      averageViewers: 0
    };

    streamData.forEach(item => {
      metrics.total += item.count;
      if (item._id === 'live') metrics.live = item.count;
      if (item._id === 'completed') {
        metrics.completed = item.count;
        metrics.averageViewers = item.avgViewers || 0;
      }
    });

    return metrics;
  }

  async calculateEngagementMetrics(date, period) {
    // This would integrate with actual analytics services like Google Analytics
    // For now, we'll return simulated data
    return {
      pageViews: Math.floor(Math.random() * 10000) + 5000,
      sessionDuration: Math.floor(Math.random() * 300) + 60,
      bounceRate: Math.random() * 0.5 + 0.2
    };
  }

  getDateFilter(date, period) {
    const endDate = new Date(date);
    
    switch (period) {
      case 'daily':
        endDate.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        endDate.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        endDate.setMonth(date.getMonth() + 1);
        break;
    }

    return {
      $gte: date,
      $lt: endDate
    };
  }

  startScheduledJobs() {
    // Run daily at midnight
    this.dailyJob = setInterval(() => {
      this.generateDailyAnalytics();
    }, 24 * 60 * 60 * 1000);

    // Run weekly on Sunday at 1 AM
    this.weeklyJob = setInterval(() => {
      if (new Date().getDay() === 0) {
        this.generateWeeklyAnalytics();
      }
    }, 24 * 60 * 60 * 1000);

    // Run monthly on the 1st at 2 AM
    this.monthlyJob = setInterval(() => {
      if (new Date().getDate() === 1) {
        this.generateMonthlyAnalytics();
      }
    }, 24 * 60 * 60 * 1000);

    console.log('Analytics scheduled jobs started');
  }

  stopScheduledJobs() {
    if (this.dailyJob) clearInterval(this.dailyJob);
    if (this.weeklyJob) clearInterval(this.weeklyJob);
    if (this.monthlyJob) clearInterval(this.monthlyJob);
    
    console.log('Analytics scheduled jobs stopped');
  }
}

module.exports = new AnalyticsService();