const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

describe('💳 Orders & Checkout Lifecycle API Tests', () => {
  let customerToken = '';
  let adminToken = '';
  let sampleProduct = null;
  let initialStock = 0;
  let createdOrderId = '';
  const testEmail = `order_tester_${Date.now()}@test.com`;

  test('Setup: Authenticate users, get product, and prepare cart', async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ecommerce.com', password: 'Admin@123' });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.data.token;

    // Register dedicated customer
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Order Tester',
        email: testEmail,
        password: 'Password123!',
      });
    assert.strictEqual(regRes.status, 201);
    customerToken = regRes.body.data.token;

    // Get a product
    const prodRes = await request(app).get('/api/products?limit=1');
    assert.strictEqual(prodRes.status, 200);
    sampleProduct = prodRes.body.data[0];
    initialStock = sampleProduct.stock;

    // Add 2 units to cart
    const addRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: sampleProduct.id, quantity: 2 });
    assert.strictEqual(addRes.status, 200);
  });

  test('POST /api/orders/checkout - Creates pending order from cart items', async () => {
    const res = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        shippingAddress: '456 Innovation Drive, Suite 100, Silicon Valley, CA 94025',
        paymentMethod: 'card',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.order.id);
    assert.strictEqual(res.body.data.order.status, 'PENDING');
    assert.strictEqual(res.body.data.order.items.length, 1);
    assert.strictEqual(res.body.data.order.items[0].quantity, 2);

    createdOrderId = res.body.data.order.id;
  });

  test('POST /api/payments/confirm-simulated - Confirms payment, marks order PAID, decrements stock, and clears cart', async () => {
    const res = await request(app)
      .post('/api/payments/confirm-simulated')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: createdOrderId,
        sessionId: `cs_test_session_${Date.now()}`,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'PAID');

    // Verify product stock decremented by 2
    const prodRes = await request(app).get(`/api/products/${sampleProduct.id}`);
    assert.strictEqual(prodRes.status, 200);
    assert.strictEqual(prodRes.body.data.stock, initialStock - 2);

    // Verify cart is now empty
    const cartRes = await request(app).get('/api/cart').set('Authorization', `Bearer ${customerToken}`);
    assert.strictEqual(cartRes.status, 200);
    assert.strictEqual(cartRes.body.data.itemCount, 0);
  });

  test('GET /api/orders - Customer can view their order history', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.some((o) => o.id === createdOrderId));
  });

  test('PATCH /api/admin/orders/:id/status - Admin updates order to SHIPPED', async () => {
    const res = await request(app)
      .patch(`/api/admin/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SHIPPED' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'SHIPPED');
  });

  test('GET /api/admin/dashboard - Admin dashboard reflects updated revenue and order metrics', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.metrics.totalRevenue > 0);
    assert.ok(res.body.data.metrics.totalOrders >= 1);
  });
});
