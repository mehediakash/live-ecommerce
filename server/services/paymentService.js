const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  // ✅ Stripe Customer create করার method
  async createStripeCustomer({ email, name }) {
    try {
      const customer = await stripe.customers.create({
        email,
        name
      });
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata
      });
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async createPaymentIntent(amount, currency, customerId, metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: currency || 'usd',
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        }
      });
      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  async createCheckoutSession(lineItems, successUrl, cancelUrl, metadata = {}) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata
      });
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  async handleWebhook(payload, signature, webhookSecret) {
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw error;
    }
  }

  async refundPayment(paymentIntentId, amount) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined
      });
      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  async processPayment({ amount, paymentMethodId, customerId, orderId, currency = 'usd' }) {
    try {
      const paymentData = {
        amount: Math.round(amount * 100),
        currency,
        payment_method: paymentMethodId,
        confirm: true,
        metadata: { orderId },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        }
      };

      // ✅ Only include customer if it is not empty/null
      if (customerId) {
        paymentData.customer = customerId;
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentData);
      return paymentIntent;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }
}

// 🔹 Export single instance
module.exports = new PaymentService();
