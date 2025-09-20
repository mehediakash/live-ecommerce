const PaymentService = require('../services/paymentService');
const Order = require('../models/Order');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const { amount, currency, orderId } = req.body;
  
  let user = await User.findById(req.user.id);
  
  // Create or get Stripe customer
  if (!user.stripeCustomerId) {
    const customer = await PaymentService.createCustomer(
      user.email,
      `${user.profile.firstName} ${user.profile.lastName}`,
      { userId: user._id.toString() }
    );
    user.stripeCustomerId = customer.id;
    await user.save();
  }
  
  const paymentIntent = await PaymentService.createPaymentIntent(
    amount,
    currency,
    user.stripeCustomerId,
    { orderId }
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }
  });
});



exports.createCheckoutSession = catchAsync(async (req, res, next) => {
  const { lineItems, successUrl, cancelUrl, orderId } = req.body;

  const session = await PaymentService.createCheckoutSession(
    lineItems,
    successUrl,
    cancelUrl,
    { orderId, userId: req.user.id }
  );

  res.status(200).json({
    status: 'success',
    data: {
      sessionId: session.id,
      url: session.url
    }
  });
});




exports.handleWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  const payload = req.body; // raw body as Buffer

  try {
    // PaymentService.handleWebhook expects raw string or Buffer
    const event = await PaymentService.handleWebhook(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent); // তোমার existing logic
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentFailure(failedPayment); // existing logic
        break;

      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutCompletion(session); // existing logic
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});


// Helper functions
async function handlePaymentSuccess(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  if (orderId) {
    await Order.findByIdAndUpdate(orderId, {
      'payment.status': 'completed',
      'payment.transactionId': paymentIntent.id,
      'payment.paidAt': new Date(),
      status: 'confirmed'
    });
  }
}

async function handlePaymentFailure(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  if (orderId) {
    await Order.findByIdAndUpdate(orderId, {
      'payment.status': 'failed'
    });
  }
}

async function handleCheckoutCompletion(session) {
  const orderId = session.metadata.orderId;
  const userId = session.metadata.userId;
  
  if (orderId) {
    await Order.findByIdAndUpdate(orderId, {
      'payment.status': 'completed',
      'payment.transactionId': session.payment_intent,
      'payment.paidAt': new Date(),
      status: 'confirmed'
    });
  }
}

exports.processRefund = catchAsync(async (req, res, next) => {
  const { orderId, amount } = req.body;

  const order = await Order.findOne({ orderId });
  if (!order) {
    return res.status(404).json({ status: 'error', message: 'Order not found' });
  }

  const refundAmount = amount || order.totalAmount;

  if (refundAmount > order.payment.amount) {
    return res.status(400).json({
      status: 'error',
      message: `Refund amount ($${refundAmount}) is greater than charged amount ($${order.payment.amount})`
    });
  }

  const refund = await PaymentService.refundPayment(
    order.payment.transactionId,
    refundAmount
  );

  order.refundAmount = refundAmount;
  order.payment.status = 'refunded';
  await order.save();

  res.status(200).json({ status: 'success', data: { refund } });
});
