const stripeService = require('../services/stripe.service');
const config = require('../config/env');
const prisma = require('../config/db');

/**
 * Handle Stripe Webhooks
 */
const handleWebhook = async (req, res, next) => {
  try {
    let event = req.body;

    // If Stripe signature is provided with raw body
    const signature = req.headers['stripe-signature'];
    if (signature && config.stripeWebhookSecret && stripeService.isRealStripeKey) {
      const Stripe = require('stripe');
      const stripe = new Stripe(config.stripeSecretKey);
      try {
        event = stripe.webhooks.constructEvent(
          req.rawBody || req.body,
          signature,
          config.stripeWebhookSecret
        );
      } catch (err) {
        console.error('⚠️ Stripe Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    const result = await stripeService.handleWebhookEvent(event);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Endpoint to confirm simulated payments (instant testing without webhook tunneling)
 */
const confirmSimulatedPayment = async (req, res, next) => {
  try {
    const { orderId, sessionId, paymentIntentId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId is required to confirm payment.',
      });
    }

    // Check user authorization if user token provided
    if (req.user && req.user.role !== 'ADMIN') {
      const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
      if (existingOrder && existingOrder.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this order.',
        });
      }
    }

    const result = await stripeService.processPaymentSuccess({
      orderId,
      sessionId: sessionId || `cs_sim_${Date.now()}`,
      paymentIntentId: paymentIntentId || `pi_sim_${Date.now()}`,
    });

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and order processed successfully',
      data: result.order,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Stripe public config (for frontend integration)
 */
const getPaymentConfig = (req, res) => {
  res.status(200).json({
    success: true,
    publishableKey: config.stripePublishableKey,
    currency: config.stripeCurrency,
    isRealStripe: stripeService.isRealStripeKey,
  });
};

module.exports = {
  handleWebhook,
  confirmSimulatedPayment,
  getPaymentConfig,
};
