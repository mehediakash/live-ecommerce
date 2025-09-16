const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  async createCustomer(email, name) {
    try {
      const customer = await stripe.customers.create({
        email,
        name
      });
      
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }
  
  async addPaymentMethod(customerId, paymentMethodId) {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });
      
      return paymentMethod;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  }
  
  async processPayment({ amount, paymentMethodId, customerId, orderId }) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          orderId
        }
      });
      
      return paymentIntent;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }
  
  async processRefund({ paymentIntentId, amount }) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100)
      });
      
      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }
  
  async createSetupIntent(customerId) {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card']
      });
      
      return setupIntent;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }
  
  async getPaymentMethods(customerId) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });
      
      return paymentMethods.data;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }
  
  async deletePaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      
      return paymentMethod;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();