const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');

/**
 * @route   GET /api/payments/config
 * @desc    Get Stripe publishable key and configuration
 * @access  Public
 */
router.get('/config', paymentController.getPaymentConfig);

/**
 * @route   POST /api/payments/webhook
 * @desc    Receive and process Stripe Webhooks
 * @access  Public (Signature validated)
 */
router.post('/webhook', paymentController.handleWebhook);

/**
 * @route   POST /api/payments/confirm-simulated
 * @desc    Simulate instant payment confirmation for testing / demo sandbox
 * @access  Public / Optional Auth
 */
router.post('/confirm-simulated', optionalAuth, paymentController.confirmSimulatedPayment);

module.exports = router;
