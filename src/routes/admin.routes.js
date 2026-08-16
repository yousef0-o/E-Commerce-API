const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const { validate, updateOrderStatusSchema } = require('../middlewares/validate.middleware');

// Protect all admin endpoints
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get aggregated metrics & revenue stats
 * @access  Private (Admin)
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @route   GET /api/admin/orders
 * @desc    List all orders across all customers
 * @access  Private (Admin)
 */
router.get('/orders', adminController.getAllOrders);

/**
 * @route   PATCH /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Private (Admin)
 */
router.patch('/orders/:id/status', validate(updateOrderStatusSchema), adminController.updateOrderStatus);

/**
 * @route   GET /api/admin/users
 * @desc    List all registered customers
 * @access  Private (Admin)
 */
router.get('/users', adminController.getAllUsers);

module.exports = router;
