require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-ecommerce-jwt-key-change-in-prod-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key_for_development',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_mock_stripe_key_for_development',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_webhook_secret',
  stripeCurrency: process.env.STRIPE_CURRENCY || 'usd',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};
