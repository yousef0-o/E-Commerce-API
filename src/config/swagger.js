const swaggerJsDoc = require('swagger-jsdoc');
const config = require('./env');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce Platform API',
      version: '1.0.0',
      description:
        'A comprehensive RESTful API for an E-Commerce platform with JWT authentication, SQLite/Prisma ORM data model, Stripe Payments integration, shopping cart workflows, and an administrative control panel.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /api/auth/login or /api/auth/register',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'customer@ecommerce.com' },
            role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'], example: 'CUSTOMER' },
            phone: { type: 'string', example: '+1 555-0199' },
            address: { type: 'string', example: '123 Main St, New York, NY' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'AcousticPro ANC Wireless Headphones' },
            slug: { type: 'string', example: 'acousticpro-anc-headphones' },
            description: { type: 'string', example: 'Hybrid active noise cancellation' },
            price: { type: 'number', format: 'float', example: 249.99 },
            stock: { type: 'integer', example: 35 },
            imageUrl: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean', example: true },
            categoryId: { type: 'string', format: 'uuid' },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            price: { type: 'number' },
            quantity: { type: 'integer' },
            lineTotal: { type: 'number' },
            stockAvailable: { type: 'integer' },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            cartId: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            itemCount: { type: 'integer', example: 2 },
            subtotal: { type: 'number', example: 299.99 },
            estimatedTax: { type: 'number', example: 24.00 },
            shipping: { type: 'number', example: 0.00 },
            grandTotal: { type: 'number', example: 323.99 },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string' },
            totalAmount: { type: 'number', example: 249.99 },
            currency: { type: 'string', example: 'usd' },
            status: {
              type: 'string',
              enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
              example: 'PAID',
            },
            shippingAddress: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/api/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new customer account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Alice Smith' },
                    email: { type: 'string', example: 'alice@example.com' },
                    password: { type: 'string', example: 'Secret123!' },
                    phone: { type: 'string', example: '+1 555-4321' },
                    address: { type: 'string', example: '456 Elm St, Austin, TX' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Registration successful, returns JWT token' },
            400: { description: 'Validation error' },
            409: { description: 'Email already exists' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Log in with email & password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'customer@ecommerce.com' },
                    password: { type: 'string', example: 'Customer@123' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful, returns JWT token' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'User profile returned' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/products': {
        get: {
          tags: ['Products'],
          summary: 'List products with search, filtering, and pagination',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search keyword in name or description' },
            { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Category slug or ID' },
            { name: 'minPrice', in: 'query', schema: { type: 'number' }, description: 'Minimum price filter' },
            { name: 'maxPrice', in: 'query', schema: { type: 'number' }, description: 'Maximum price filter' },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'name_asc', 'stock_desc'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
          ],
          responses: {
            200: { description: 'Paginated list of products' },
          },
        },
        post: {
          tags: ['Products'],
          summary: 'Create a new product (Admin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'description', 'price', 'categoryId'],
                  properties: {
                    name: { type: 'string', example: 'Smart LED Desk Lamp' },
                    description: { type: 'string', example: 'Dimmable color temperature lamp with wireless charger base' },
                    price: { type: 'number', example: 49.99 },
                    stock: { type: 'integer', example: 50 },
                    categoryId: { type: 'string' },
                    imageUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Product created' },
            403: { description: 'Forbidden - Admin required' },
          },
        },
      },
      '/api/products/{id}': {
        get: {
          tags: ['Products'],
          summary: 'Get product details by ID or slug',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Product details' },
            404: { description: 'Product not found' },
          },
        },
        put: {
          tags: ['Products'],
          summary: 'Update product (Admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Product' },
              },
            },
          },
          responses: {
            200: { description: 'Product updated' },
            403: { description: 'Admin required' },
          },
        },
        delete: {
          tags: ['Products'],
          summary: 'Delete or archive product (Admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Product deleted or archived' },
          },
        },
      },
      '/api/categories': {
        get: {
          tags: ['Categories'],
          summary: 'List all product categories',
          responses: {
            200: { description: 'List of categories' },
          },
        },
        post: {
          tags: ['Categories'],
          summary: 'Create category (Admin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', example: 'Footwear & Shoes' },
                    description: { type: 'string', example: 'Running shoes, sneakers, and boots' },
                    imageUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Category created' },
          },
        },
      },
      '/api/cart': {
        get: {
          tags: ['Cart'],
          summary: 'Get user shopping cart with totals',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Current shopping cart' },
          },
        },
        delete: {
          tags: ['Cart'],
          summary: 'Clear all items in shopping cart',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Cart cleared' },
          },
        },
      },
      '/api/cart/items': {
        post: {
          tags: ['Cart'],
          summary: 'Add an item to the shopping cart',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['productId', 'quantity'],
                  properties: {
                    productId: { type: 'string', example: 'prod-id-here' },
                    quantity: { type: 'integer', example: 1 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Item added' },
            400: { description: 'Out of stock or invalid quantity' },
          },
        },
      },
      '/api/cart/items/{itemId}': {
        put: {
          tags: ['Cart'],
          summary: 'Update item quantity in cart',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['quantity'],
                  properties: { quantity: { type: 'integer', example: 2 } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Quantity updated' },
          },
        },
        delete: {
          tags: ['Cart'],
          summary: 'Remove an item from cart',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Item removed' },
          },
        },
      },
      '/api/orders/checkout': {
        post: {
          tags: ['Orders & Checkout'],
          summary: 'Checkout current cart and generate Stripe session/intent',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['shippingAddress'],
                  properties: {
                    shippingAddress: { type: 'string', example: '123 Market St, San Francisco, CA 94105' },
                    paymentMethod: { type: 'string', enum: ['card', 'stripe_checkout'], default: 'card' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Order created with payment details' },
            400: { description: 'Cart empty or stock error' },
          },
        },
      },
      '/api/orders': {
        get: {
          tags: ['Orders & Checkout'],
          summary: 'Get customer order history',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'List of customer orders' },
          },
        },
      },
      '/api/orders/{id}': {
        get: {
          tags: ['Orders & Checkout'],
          summary: 'Get order details by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Order details' },
          },
        },
      },
      '/api/payments/webhook': {
        post: {
          tags: ['Payments'],
          summary: 'Stripe Webhook listener',
          responses: {
            200: { description: 'Webhook acknowledged' },
          },
        },
      },
      '/api/payments/confirm-simulated': {
        post: {
          tags: ['Payments'],
          summary: 'Simulated payment confirmation for instant local testing',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['orderId'],
                  properties: {
                    orderId: { type: 'string' },
                    sessionId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Payment confirmed & inventory decremented' },
          },
        },
      },
      '/api/admin/dashboard': {
        get: {
          tags: ['Admin Panel'],
          summary: 'Get admin overview revenue & sales metrics',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Dashboard metrics' },
            403: { description: 'Forbidden - Admin only' },
          },
        },
      },
      '/api/admin/orders': {
        get: {
          tags: ['Admin Panel'],
          summary: 'View all orders across all customers',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'All orders list' },
          },
        },
      },
      '/api/admin/orders/{id}/status': {
        patch: {
          tags: ['Admin Panel'],
          summary: 'Update order lifecycle status',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Order status updated' },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
