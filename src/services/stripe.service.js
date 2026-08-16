const Stripe = require('stripe');
const config = require('../config/env');
const prisma = require('../config/db');

// Initialize Stripe instance (fallback gracefully if mock/invalid key)
let stripe = null;
const isRealStripeKey =
  config.stripeSecretKey &&
  config.stripeSecretKey.startsWith('sk_') &&
  !config.stripeSecretKey.includes('mock');

if (isRealStripeKey) {
  try {
    stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
  } catch (err) {
    console.warn('⚠️ Stripe initialization failed, switching to sandbox simulator:', err.message);
  }
}

/**
 * Create Stripe Checkout Session (or Sandbox Session)
 */
const createCheckoutSession = async ({ order, items, user, successUrl, cancelUrl }) => {
  const lineItems = items.map((item) => ({
    price_data: {
      currency: config.stripeCurrency,
      product_data: {
        name: item.productName,
      },
      unit_amount: Math.round(item.unitPrice * 100), // cents
    },
    quantity: item.quantity,
  }));

  // If real Stripe is available, create checkout session
  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        customer_email: user.email,
        client_reference_id: order.id,
        metadata: {
          orderId: order.id,
          userId: user.id,
        },
        success_url:
          successUrl ||
          `${config.clientUrl}/order-success.html?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${config.clientUrl}/?cancelled=true`,
      });

      // Update order with session ID
      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        isSimulated: false,
      };
    } catch (err) {
      console.warn('Stripe Checkout API call failed; falling back to simulator:', err.message);
    }
  }

  // Sandbox / Test Simulator Mode
  const simulatedSessionId = `cs_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: simulatedSessionId },
  });

  const simulatedCheckoutUrl = `/order-success.html?order_id=${order.id}&session_id=${simulatedSessionId}&mode=simulated`;

  return {
    sessionId: simulatedSessionId,
    checkoutUrl: simulatedCheckoutUrl,
    isSimulated: true,
  };
};

/**
 * Create a direct PaymentIntent
 */
const createPaymentIntent = async ({ order, user }) => {
  const amountInCents = Math.round(order.totalAmount * 100);

  if (stripe) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: config.stripeCurrency,
        metadata: {
          orderId: order.id,
          userId: user.id,
        },
        receipt_email: user.email,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: paymentIntent.id },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        isSimulated: false,
      };
    } catch (err) {
      console.warn('Stripe PaymentIntent call failed; falling back to simulator:', err.message);
    }
  }

  // Sandbox simulation
  const simulatedIntentId = `pi_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: simulatedIntentId },
  });

  return {
    clientSecret: `${simulatedIntentId}_secret_${Date.now()}`,
    paymentIntentId: simulatedIntentId,
    isSimulated: true,
  };
};

/**
 * Process order fulfillment upon confirmed payment (Transaction: Update order, decrement stock, record payment, clear cart)
 */
const processPaymentSuccess = async ({ orderId, paymentIntentId, sessionId, rawEvent = null }) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: true },
      },
      user: true,
    },
  });

  if (!order) {
    throw new Error(`Order with ID ${orderId} not found.`);
  }

  // If already paid, return early (idempotency)
  if (order.status === 'PAID' || order.status === 'PROCESSING' || order.status === 'SHIPPED') {
    return { order, alreadyProcessed: true };
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Decrement inventory for each product
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    // 2. Update Order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        stripePaymentIntentId: paymentIntentId || order.stripePaymentIntentId,
        stripeSessionId: sessionId || order.stripeSessionId,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    // 3. Create Payment record
    await tx.payment.create({
      data: {
        orderId,
        stripePaymentIntentId: paymentIntentId || order.stripePaymentIntentId || 'simulated_pi',
        stripeSessionId: sessionId || order.stripeSessionId,
        amount: order.totalAmount,
        currency: order.currency,
        status: 'SUCCEEDED',
        paymentMethod: 'card',
        rawResponse: rawEvent ? JSON.stringify(rawEvent) : 'Simulated Payment Succeeded',
      },
    });

    // 4. Clear user's shopping cart
    const userCart = await tx.cart.findUnique({
      where: { userId: order.userId },
    });

    if (userCart) {
      await tx.cartItem.deleteMany({
        where: { cartId: userCart.id },
      });
    }

    return { order: updatedOrder, alreadyProcessed: false };
  });
};

/**
 * Handle incoming Stripe webhook event
 */
const handleWebhookEvent = async (event) => {
  const eventType = event.type;
  console.log(`🔔 Stripe Webhook Received: ${eventType}`);

  switch (eventType) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.metadata?.orderId || session.client_reference_id;
      if (orderId) {
        await processPaymentSuccess({
          orderId,
          paymentIntentId: session.payment_intent,
          sessionId: session.id,
          rawEvent: event,
        });
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        await processPaymentSuccess({
          orderId,
          paymentIntentId: paymentIntent.id,
          rawEvent: event,
        });
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        await prisma.payment.create({
          data: {
            orderId,
            stripePaymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: 'FAILED',
            rawResponse: JSON.stringify(event),
          },
        });
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${eventType}`);
  }

  return { received: true };
};

module.exports = {
  createCheckoutSession,
  createPaymentIntent,
  processPaymentSuccess,
  handleWebhookEvent,
  isRealStripeKey,
};
