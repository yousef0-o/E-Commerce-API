const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate, checkoutSchema } = require('../middlewares/validate.middleware');

router.use(authenticate);

/**
 * @route   POST /api/orders/checkout
 * @desc    Initiate checkout from cart, create order, and get Stripe session/intent
 * @access  Private
 */
router.post('/checkout', validate(checkoutSchema), orderController.checkout);

/**
 * @route   GET /api/orders
 * @desc    Get order history for current user
 * @access  Private
 */
router.get('/', orderController.getMyOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get specific order details
 * @access  Private
 */
router.get('/:id', orderController.getOrderById);

module.exports = router;
