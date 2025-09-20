const Product = require('../models/Product');
const PriceAlert = require('../models/PriceAlert'); // নতুন মডেল বানাতে হবে
const { sendEmail } = require('./email');

const checkPriceAlerts = async () => {
  try {
    const alerts = await PriceAlert.find({ isActive: true }).populate('user').populate('product');

    for (const alert of alerts) {
      if (alert.product.price <= alert.targetPrice) {
        // Email send
        await sendEmail({
          email: alert.user.email,
          subject: `Price Alert: ${alert.product.name}`,
          message: `Hello ${alert.user.firstName}, the product "${alert.product.name}" is now at $${alert.product.price}, below your target price of $${alert.targetPrice}.`
        });

        // Mark alert as sent
        alert.isActive = false;
        await alert.save();
      }
    }
  } catch (err) {
    console.error('Price alert check error:', err);
  }
};

module.exports = checkPriceAlerts;
