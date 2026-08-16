const { test, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

describe('📦 Products & Search API Tests', () => {
  let adminToken = '';
  let customerToken = '';
  let categoryId = '';
  let createdProductId = '';

  test('Setup: Authenticate Admin & Customer', async () => {
    // Admin login
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@ecommerce.com', password: 'Admin@123' });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.data.token;

    // Customer login
    const custRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@ecommerce.com', password: 'Customer@123' });
    assert.strictEqual(custRes.status, 200);
    customerToken = custRes.body.data.token;

    // Get a category ID
    const catRes = await request(app).get('/api/categories');
    assert.strictEqual(catRes.status, 200);
    assert.ok(catRes.body.data.length > 0);
    categoryId = catRes.body.data[0].id;
  });

  test('GET /api/products - Lists products with pagination and category inclusion', async () => {
    const res = await request(app).get('/api/products?limit=5');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.strictEqual(res.body.pagination.limit, 5);
  });

  test('GET /api/products?search=Keyboard - Filters by search term', async () => {
    const res = await request(app).get('/api/products?search=Keyboard');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.some((p) => p.name.includes('Keyboard')));
  });

  test('POST /api/products - Admin creates product successfully', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Test Admin Product ${Date.now()}`,
        description: 'High performance testing unit with ultra durable build',
        price: 99.99,
        stock: 20,
        categoryId: categoryId,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.price, 99.99);
    assert.strictEqual(res.body.data.stock, 20);
    createdProductId = res.body.data.id;
  });

  test('POST /api/products - Rejects regular customer with 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Unauthorized Product',
        description: 'Should be rejected by role guard',
        price: 50.0,
        stock: 10,
        categoryId: categoryId,
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  test('PATCH /api/products/:id/inventory - Admin updates stock level', async () => {
    const res = await request(app)
      .patch(`/api/products/${createdProductId}/inventory`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 45 });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.stock, 45);
  });

  test('DELETE /api/products/:id - Admin deletes test product', async () => {
    const res = await request(app)
      .delete(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
  });
});
