const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate, addToCartSchema, updateCartItemSchema } = require('../middlewares/validate.middleware');

// All cart endpoints require user authentication
router.use(authenticate);

/**
 * @route   GET /api/cart
 * @desc    Get user's current shopping cart
 * @access  Private
 */
router.get('/', cartController.getCart);

/**
 * @route   POST /api/cart/items
 * @desc    Add product to cart
 * @access  Private
 */
router.post('/items', validate(addToCartSchema), cartController.addItem);

/**
 * @route   PUT /api/cart/items/:itemId
 * @desc    Update quantity of a cart item
 * @access  Private
 */
router.put('/items/:itemId', validate(updateCartItemSchema), cartController.updateItemQuantity);

/**
 * @route   DELETE /api/cart/items/:itemId
 * @desc    Remove an item from the cart
 * @access  Private
 */
router.delete('/items/:itemId', cartController.removeItem);

/**
 * @route   DELETE /api/cart
 * @desc    Clear all items in cart
 * @access  Private
 */
router.delete('/', cartController.clearCart);

module.exports = router;
