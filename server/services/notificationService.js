// const User = require('../models/User');
// const { sendEmail } = require('../utils/email');
// const { sendPushNotification } = require('../utils/pushNotification');

// class NotificationService {
//   async sendEmailNotification(userId, subject, message) {
//     try {
//       const user = await User.findById(userId);
//       if (!user || !user.notifications.email) return;
      
//       await sendEmail({
//         email: user.email,
//         subject,
//         message
//       });
//     } catch (error) {
//       console.error('Error sending email notification:', error);
//     }
//   }

//   async sendPushNotification(userId, title, body, data = {}) {
//     try {
//       const user = await User.findById(userId);
//       if (!user || !user.notifications.push) return;
      
//       // This would require integration with a push notification service
//       // like Firebase Cloud Messaging (FCM) or Amazon SNS
//       await sendPushNotification(user.pushToken, title, body, data);
//     } catch (error) {
//       console.error('Error sending push notification:', error);
//     }
//   }

//   async sendSMSNotification(userId, message) {
//     try {
//       const user = await User.findById(userId);
//       if (!user || !user.notifications.sms || !user.phone) return;
      
//       // This would require integration with an SMS service like Twilio
//       // await sendSMS(user.phone, message);
//     } catch (error) {
//       console.error('Error sending SMS notification:', error);
//     }
//   }

//   async sendNewBidNotification(sellerId, product, amount) {
//     const subject = 'New Bid on Your Product';
//     const message = `You have received a new bid of $${amount} on your product "${product.name}".`;
    
//     await this.sendEmailNotification(sellerId, subject, message);
//     await this.sendPushNotification(sellerId, 'New Bid', message, {
//       type: 'new_bid',
//       productId: product._id.toString()
//     });
//   }

//   async sendOutbidNotification(bidderId, product, amount) {
//     const subject = 'You\'ve Been Outbid';
//     const message = `You've been outbid on "${product.name}". The current bid is now $${amount}.`;
    
//     await this.sendEmailNotification(bidderId, subject, message);
//     await this.sendPushNotification(bidderId, 'Outbid', message, {
//       type: 'outbid',
//       productId: product._id.toString()
//     });
//   }

//   async sendAuctionWonNotification(winnerId, product, amount, orderId) {
//     const subject = 'You Won the Auction!';
//     const message = `Congratulations! You won the auction for "${product.name}" with a bid of $${amount}. Please complete your purchase.`;
    
//     await this.sendEmailNotification(winnerId, subject, message);
//     await this.sendPushNotification(winnerId, 'Auction Won', message, {
//       type: 'auction_won',
//       productId: product._id.toString(),
//       orderId: orderId.toString()
//     });
//   }

//   async sendAuctionSoldNotification(sellerId, product, amount, orderId) {
//     const subject = 'Your Item Sold!';
//     const message = `Congratulations! Your item "${product.name}" sold for $${amount}. Please prepare it for shipping.`;
    
//     await this.sendEmailNotification(sellerId, subject, message);
//     await this.sendPushNotification(sellerId, 'Item Sold', message, {
//       type: 'auction_sold',
//       productId: product._id.toString(),
//       orderId: orderId.toString()
//     });
//   }

//   async sendAuctionLostNotification(bidderId, product, winningAmount) {
//     const subject = 'Auction Ended';
//     const message = `The auction for "${product.name}" has ended. The winning bid was $${winningAmount}.`;
    
//     await this.sendEmailNotification(bidderId, subject, message);
//     await this.sendPushNotification(bidderId, 'Auction Ended', message, {
//       type: 'auction_lost',
//       productId: product._id.toString()
//     });
//   }

//   async sendAuctionEndedNoWinnerNotification(userId, product) {
//     const subject = 'Auction Ended';
//     const message = `The auction for "${product.name}" has ended without a winner.`;
    
//     await this.sendEmailNotification(userId, subject, message);
//     await this.sendPushNotification(userId, 'Auction Ended', message, {
//       type: 'auction_ended_no_winner',
//       productId: product._id.toString()
//     });
//   }

//   async sendStreamStartingNotification(followerId, stream) {
//     const subject = 'Stream Starting Soon';
//     const message = `"${stream.title}" is starting soon. Don't miss it!`;
    
//     await this.sendEmailNotification(followerId, subject, message);
//     await this.sendPushNotification(followerId, 'Stream Starting', message, {
//       type: 'stream_starting',
//       streamId: stream._id.toString()
//     });
//   }

//   async sendNewFollowerNotification(userId, follower) {
//     const subject = 'New Follower';
//     const message = `${follower.profile.firstName} ${follower.profile.lastName} started following you.`;
    
//     await this.sendEmailNotification(userId, subject, message);
//     await this.sendPushNotification(userId, 'New Follower', message, {
//       type: 'new_follower',
//       followerId: follower._id.toString()
//     });
//   }

//   async sendOrderConfirmationNotification(userId, order) {
//     const subject = 'Order Confirmation';
//     const message = `Your order #${order.orderId} has been confirmed. Thank you for your purchase!`;
    
//     await this.sendEmailNotification(userId, subject, message);
//     await this.sendPushNotification(userId, 'Order Confirmed', message, {
//       type: 'order_confirmation',
//       orderId: order._id.toString()
//     });
//   }

//   async sendOrderShippedNotification(userId, order, trackingNumber) {
//     const subject = 'Order Shipped';
//     const message = `Your order #${order.orderId} has been shipped. Tracking number: ${trackingNumber}`;
    
//     await this.sendEmailNotification(userId, subject, message);
//     await this.sendPushNotification(userId, 'Order Shipped', message, {
//       type: 'order_shipped',
//       orderId: order._id.toString()
//     });
//   }
// }

// module.exports = new NotificationService();

const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Send real-time notification via Socket.io
   * @param {Object} io - Socket.io instance
   * @param {string} userId - User ID to send notification to
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   */
  async sendNotification(io, userId, type, title, message, data = {}) {
    try {
      // Store notification in database
      const notification = await Notification.create({
        user: userId,
        type,
        title,
        message,
        data,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      // Emit real-time notification to the specific user
      io.to(`user_${userId}`).emit('notification', {
        id: notification._id,
        type,
        title,
        message,
        data,
        createdAt: notification.createdAt
      });

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Object} io - Socket.io instance
   * @param {Array} userIds - Array of user IDs
   * @param {string} type - Notification type
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} data - Additional data
   */
  async sendBulkNotifications(io, userIds, type, title, message, data = {}) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const notification = await this.sendNotification(io, userId, type, title, message, data);
        results.push({ userId, status: 'success', notification });
      } catch (error) {
        results.push({ userId, status: 'error', error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   */
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    
    const filter = { user: userId };
    if (unreadOnly) filter.isRead = false;
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false
    });
    
    return {
      notifications,
      total,
      unreadCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    };
  }

  /**
   * Mark notifications as read
   * @param {string} userId - User ID
   * @param {Array} notificationIds - Array of notification IDs
   */
  async markAsRead(userId, notificationIds) {
    await Notification.updateMany(
      { _id: { $in: notificationIds }, user: userId },
      { isRead: true, readAt: new Date() }
    );
    
    return { success: true };
  }

  /**
   * Delete notifications
   * @param {string} userId - User ID
   * @param {Array} notificationIds - Array of notification IDs
   */
  async deleteNotifications(userId, notificationIds) {
    await Notification.deleteMany({
      _id: { $in: notificationIds },
      user: userId
    });
    
    return { success: true };
  }

  // Specific notification types
  async sendNewBidNotification(io, sellerId, product, amount) {
    return this.sendNotification(
      io,
      sellerId,
      'new_bid',
      'New Bid on Your Product',
      `You have received a new bid of $${amount} on your product "${product.name}".`,
      { productId: product._id.toString(), amount }
    );
  }

  async sendOutbidNotification(io, bidderId, product, amount) {
    return this.sendNotification(
      io,
      bidderId,
      'outbid',
      'You\'ve Been Outbid',
      `You've been outbid on "${product.name}". The current bid is now $${amount}.`,
      { productId: product._id.toString(), amount }
    );
  }

  async sendAuctionWonNotification(io, winnerId, product, amount, orderId) {
    return this.sendNotification(
      io,
      winnerId,
      'auction_won',
      'You Won the Auction!',
      `Congratulations! You won the auction for "${product.name}" with a bid of $${amount}. Please complete your purchase.`,
      { productId: product._id.toString(), orderId: orderId.toString(), amount }
    );
  }

  async sendAuctionSoldNotification(io, sellerId, product, amount, orderId) {
    return this.sendNotification(
      io,
      sellerId,
      'auction_sold',
      'Your Item Sold!',
      `Congratulations! Your item "${product.name}" sold for $${amount}. Please prepare it for shipping.`,
      { productId: product._id.toString(), orderId: orderId.toString(), amount }
    );
  }

  async sendAuctionEndedNoWinnerNotification(io, userId, product) {
    return this.sendNotification(
      io,
      userId,
      'auction_ended_no_winner',
      'Auction Ended',
      `The auction for "${product.name}" has ended without a winner.`,
      { productId: product._id.toString() }
    );
  }

   async sendStreamStartingNotification(io, followerId, stream) {
    return this.sendNotification(
      io,
      followerId,
      'stream_starting',
      'Stream Starting Soon',
      `"${stream.title}" is starting soon. Don't miss it!`,
      { streamId: stream._id.toString() }
    );
  }

  async sendNewFollowerNotification(io, userId, follower) {
    return this.sendNotification(
      io,
      userId,
      'new_follower',
      'New Follower',
      `${follower.profile.firstName} ${follower.profile.lastName} started following you.`,
      { followerId: follower._id.toString() }
    );
  }

   async sendAuctionLostNotification(io, bidderId, product, winningAmount) {
    return this.sendNotification(
      io,
      bidderId,
      'auction_lost',
      'Auction Ended',
      `The auction for "${product.name}" has ended. The winning bid was $${winningAmount}.`,
      { productId: product._id.toString(), winningAmount }
    );
  }

  async sendOrderConfirmationNotification(io, userId, order) {
    return this.sendNotification(
      io,
      userId,
      'order_confirmation',
      'Order Confirmation',
      `Your order #${order.orderId} has been confirmed. Thank you for your purchase!`,
      { orderId: order._id.toString() }
    );
  }

  async sendOrderShippedNotification(io, userId, order, trackingNumber) {
    return this.sendNotification(
      io,
      userId,
      'order_shipped',
      'Order Shipped',
      `Your order #${order.orderId} has been shipped. Tracking number: ${trackingNumber}`,
      { orderId: order._id.toString(), trackingNumber }
    );
  }
}

module.exports = new NotificationService();