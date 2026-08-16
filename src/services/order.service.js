const prisma = require('../config/db');
const stripeService = require('./stripe.service');

/**
 * Initiate checkout from current shopping cart
 */
const checkoutFromCart = async ({
  userId,
  shippingAddress,
  paymentMethod = 'card',
  successUrl,
  cancelUrl,
}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      cart: {
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!user || !user.cart || user.cart.items.length === 0) {
    const error = new Error('Your cart is empty. Add products before checking out.');
    error.statusCode = 400;
    throw error;
  }

  // Validate stock for all items
  for (const item of user.cart.items) {
    if (!item.product.isActive) {
      const error = new Error(`Product "${item.product.name}" is no longer available.`);
      error.statusCode = 400;
      throw error;
    }
    if (item.product.stock < item.quantity) {
      const error = new Error(
        `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}, requested: ${item.quantity}.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Calculate totals
  const subtotal = user.cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const tax = Number((subtotal * 0.08).toFixed(2));
  const shipping = subtotal > 100 ? 0 : 9.99;
  const totalAmount = Number((subtotal + tax + shipping).toFixed(2));

  // Create Order in DB
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        totalAmount,
        currency: 'usd',
        status: 'PENDING',
        shippingAddress: shippingAddress || user.address || 'Standard Delivery',
      },
    });

    for (const item of user.cart.items) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.productId,
          productName: item.product.name,
          unitPrice: item.product.price,
          quantity: item.quantity,
          subtotal: Number((item.product.price * item.quantity).toFixed(2)),
        },
      });
    }

    return newOrder;
  });

  const fullOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });

  // Generate Stripe Session / Payment Intent
  let paymentInfo;
  if (paymentMethod === 'stripe_checkout') {
    paymentInfo = await stripeService.createCheckoutSession({
      order: fullOrder,
      items: fullOrder.items,
      user,
      successUrl,
      cancelUrl,
    });
  } else {
    paymentInfo = await stripeService.createPaymentIntent({
      order: fullOrder,
      user,
    });
  }

  return {
    order: fullOrder,
    payment: paymentInfo,
  };
};

/**
 * Get orders for a specific user
 */
const getUserOrders = async (userId, { page = 1, limit = 10 } = {}) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
  const skip = (pageNumber - 1) * pageSize;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        items: {
          include: {
            product: {
              select: { imageUrl: true, slug: true },
            },
          },
        },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * Get a specific order by ID
 */
const getOrderById = async (orderId, userId, isAdmin = false) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: {
            select: { imageUrl: true, slug: true },
          },
        },
      },
      payments: true,
    },
  });

  if (!order) {
    const error = new Error('Order not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!isAdmin && order.userId !== userId) {
    const error = new Error('Unauthorized. You do not have access to this order.');
    error.statusCode = 403;
    throw error;
  }

  return order;
};

/**
 * Update order status (Admin operation)
 */
const updateOrderStatus = async (orderId, newStatus) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    const error = new Error('Order not found.');
    error.statusCode = 404;
    throw error;
  }

  // If transitioning to CANCELLED from PAID/PROCESSING, restore stock
  if (
    newStatus === 'CANCELLED' &&
    ['PAID', 'PROCESSING', 'SHIPPED'].includes(order.status)
  ) {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
  }

  return await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true, user: true },
  });
};

module.exports = {
  checkoutFromCart,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
};
