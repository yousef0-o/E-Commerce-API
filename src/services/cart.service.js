const prisma = require('../config/db');

/**
 * Helper to ensure a cart exists for a given user
 */
const getOrCreateCart = async (userId) => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  return cart;
};

/**
 * Format cart details with subtotal, tax, and item breakdown
 */
const getFormattedCart = async (userId) => {
  const cart = await getOrCreateCart(userId);

  const cartItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      product: {
        include: {
          category: {
            select: { name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  let subtotal = 0;
  let totalItems = 0;
  let hasStockIssues = false;

  const items = cartItems.map((item) => {
    const isAvailable = item.product.isActive && item.product.stock > 0;
    const isExceedingStock = item.quantity > item.product.stock;
    const lineTotal = Number((item.product.price * item.quantity).toFixed(2));

    if (!isAvailable || isExceedingStock) {
      hasStockIssues = true;
    }

    subtotal += lineTotal;
    totalItems += item.quantity;

    return {
      id: item.id,
      productId: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      price: item.product.price,
      quantity: item.quantity,
      lineTotal,
      imageUrl: item.product.imageUrl,
      category: item.product.category?.name,
      stockAvailable: item.product.stock,
      isActive: item.product.isActive,
      isAvailable,
      isExceedingStock,
    };
  });

  subtotal = Number(subtotal.toFixed(2));
  const estimatedTax = Number((subtotal * 0.08).toFixed(2)); // 8% estimated tax
  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 9.99; // Free shipping over $100
  const grandTotal = Number((subtotal + estimatedTax + shipping).toFixed(2));

  return {
    cartId: cart.id,
    userId,
    items,
    itemCount: totalItems,
    subtotal,
    estimatedTax,
    shipping,
    grandTotal,
    hasStockIssues,
  };
};

/**
 * Add a product to the user's cart
 */
const addItemToCart = async (userId, productId, quantity = 1) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || !product.isActive) {
    const error = new Error('Product is unavailable or does not exist.');
    error.statusCode = 404;
    throw error;
  }

  if (product.stock < 1) {
    const error = new Error(`Product "${product.name}" is currently out of stock.`);
    error.statusCode = 400;
    throw error;
  }

  const cart = await getOrCreateCart(userId);

  // Check if item is already in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: product.id,
      },
    },
  });

  const newQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

  if (newQuantity > product.stock) {
    const error = new Error(
      `Cannot add ${quantity} item(s). You already have ${existingItem?.quantity || 0} in cart and only ${product.stock} are in stock.`
    );
    error.statusCode = 400;
    throw error;
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity,
      },
    });
  }

  return await getFormattedCart(userId);
};

/**
 * Update the quantity of a specific cart item
 */
const updateCartItemQuantity = async (userId, cartItemId, quantity) => {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: cartItemId,
      cartId: cart.id,
    },
    include: { product: true },
  });

  if (!cartItem) {
    const error = new Error('Cart item not found.');
    error.statusCode = 404;
    throw error;
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: cartItem.id } });
    return await getFormattedCart(userId);
  }

  if (quantity > cartItem.product.stock) {
    const error = new Error(
      `Requested quantity (${quantity}) exceeds available stock (${cartItem.product.stock}).`
    );
    error.statusCode = 400;
    throw error;
  }

  await prisma.cartItem.update({
    where: { id: cartItem.id },
    data: { quantity },
  });

  return await getFormattedCart(userId);
};

/**
 * Remove an item from the cart
 */
const removeCartItem = async (userId, cartItemId) => {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: cartItemId,
      cartId: cart.id,
    },
  });

  if (!cartItem) {
    const error = new Error('Cart item not found.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.cartItem.delete({
    where: { id: cartItem.id },
  });

  return await getFormattedCart(userId);
};

/**
 * Clear all items from user's cart
 */
const clearCart = async (userId) => {
  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return await getFormattedCart(userId);
};

module.exports = {
  getFormattedCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
};
