const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

describe('🛒 Shopping Cart API Tests', () => {
  let customerToken = '';
  let sampleProduct = null;
  let cartItemId = '';
  const testEmail = `cart_tester_${Date.now()}@test.com`;

  test('Setup: Register dedicated customer & get sample product', async () => {
    // Register unique user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Cart Tester',
        email: testEmail,
        password: 'Password123!',
      });
    assert.strictEqual(regRes.status, 201);
    customerToken = regRes.body.data.token;

    const prodRes = await request(app).get('/api/products?limit=1');
    assert.strictEqual(prodRes.status, 200);
    assert.ok(prodRes.body.data.length > 0);
    sampleProduct = prodRes.body.data[0];
  });

  test('GET /api/cart - Returns empty cart initially', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.itemCount, 0);
    assert.strictEqual(res.body.data.items.length, 0);
  });

  test('POST /api/cart/items - Adds item to cart and calculates subtotal/tax', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: sampleProduct.id,
        quantity: 2,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.itemCount, 2);
    assert.strictEqual(res.body.data.items.length, 1);
    assert.strictEqual(res.body.data.items[0].productId, sampleProduct.id);
    assert.strictEqual(res.body.data.subtotal, Number((sampleProduct.price * 2).toFixed(2)));

    cartItemId = res.body.data.items[0].id;
  });

  test('POST /api/cart/items - Rejects quantity exceeding product stock with 400', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: sampleProduct.id,
        quantity: 99999,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  test('PUT /api/cart/items/:itemId - Updates item quantity in cart', async () => {
    const res = await request(app)
      .put(`/api/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quantity: 3 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.itemCount, 3);
  });

  test('DELETE /api/cart/items/:itemId - Removes item from cart', async () => {
    const res = await request(app)
      .delete(`/api/cart/items/${cartItemId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.itemCount, 0);
  });
});
