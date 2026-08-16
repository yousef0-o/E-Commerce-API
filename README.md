# ApexStore E-Commerce REST API & Web Platform

A production-grade, full-featured E-Commerce REST API and web application built with **Node.js, Express, Prisma ORM (SQLite), JWT Authentication, and Stripe Payments integration**.

---

## Key Features

- **JWT Authentication & Authorization**:
  - Secure password hashing with `bcryptjs`.
  - Role-based access control (`CUSTOMER` vs `ADMIN`).
  - Bearer Token & HTTP-Only cookie support.
- **Complex Relational Data Model (SQLite via Prisma)**:
  - Users, Categories, Products with Inventory Stock, Shopping Carts, Cart Items, Orders, Order Items, and Payment Transactions.
  - Foreign key constraints, cascading deletions, and transactional stock updates.
- **Payment Gateway Integration (Stripe)**:
  - Supports live Stripe Checkout Sessions and PaymentIntents.
  - Stripe Webhook listener (`/api/payments/webhook`) handling `checkout.session.completed` and `payment_intent.succeeded`.
  - Built-in **Sandbox Simulation Mode** allowing full local checkout, payment processing, stock decrementing, and cart clearing without requiring active Stripe keys.
- **Advanced Product Search & Catalog**:
  - Full-text search on product names and descriptions.
  - Multi-criteria filtering by category, price ranges (`minPrice`, `maxPrice`), and in-stock status.
  - Dynamic sorting by price, date, alphabetical name, and stock level.
  - Server-side pagination.
- **Stateful Shopping Cart**:
  - Add, update quantity, and remove items.
  - Real-time stock validation (prevents over-ordering beyond warehouse inventory).
  - Automated tax (8%), shipping calculation (free over $100), and subtotal breakdown.
- **Admin Control Center (`/admin`)**:
  - Executive KPI dashboard (Gross Revenue, Total Orders, Active Users, Low Stock Alerts).
  - Product Catalog CRUD & quick inline warehouse stock editor.
  - Order fulfillment manager (`PAID` &rarr; `PROCESSING` &rarr; `SHIPPED` &rarr; `DELIVERED` &rarr; `CANCELLED` with automatic stock restoration on cancellation).
- **Interactive OpenAPI / Swagger UI (`/api/docs`)**:
  - Test every endpoint directly in the browser.
- **Responsive Customer Storefront (`/`)**:
  - Built with Tailwind CSS, category filters, live search, quick cart drawer, and checkout modal.

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18 or higher (Node v24 tested)
- **npm**: v9 or higher

### 2. Installation
```bash
# Clone or navigate to the workspace
cd "E-Commerce API"

# Install dependencies
npm install
```

### 3. Database Initialization & Seeding
```bash
# Push Prisma schema to SQLite database (dev.db)
npm run db:push

# Seed the database with categories, products, admin, and demo users
npm run seed
```

### 4. Start the Application
```bash
# Development mode with nodemon auto-restart
npm run dev

# Or standard start
npm start
```

Open your browser to:
- **Storefront UI**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Interactive Swagger Docs**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Sign In / Register**: [http://localhost:3000/login](http://localhost:3000/login)

---

## Default Demo Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@ecommerce.com` | `Admin@123` | Full admin panel, inventory control, order fulfillment, product CRUD |
| **Customer** | `customer@ecommerce.com` | `Customer@123` | Storefront browsing, cart management, checkout, order history |

*(Both accounts are pre-configured on the login page with 1-click demo buttons)*

---

## Automated Testing

Execute the comprehensive automated test suite:
```bash
npm test
```

The test runner verifies:
1. **Authentication API** (`tests/auth.test.js`): Register, duplicate email handling, login, password check, `/api/auth/me` with JWT.
2. **Products & Search API** (`tests/products.test.js`): Product listing, keyword search, category filters, admin creation, stock updates, regular user rejection (403).
3. **Shopping Cart API** (`tests/cart.test.js`): Adding items, updating quantity, stock over-limit rejection (400), removing items, and clearing carts.
4. **Orders & Checkout API** (`tests/orders.test.js`): Checkout flow, pending order creation, payment confirmation, stock decrements, cart clearing, customer history, and admin status updates.

---

## REST API Reference Overview

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new customer | Public |
| `POST` | `/api/auth/login` | Authenticate & get JWT | Public |
| `GET` | `/api/auth/me` | Get current user profile | Bearer JWT |
| `PUT` | `/api/auth/profile` | Update profile / password | Bearer JWT |
| `POST` | `/api/auth/logout` | Clear cookie | Public |

### Products & Categories (`/api/products`, `/api/categories`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Search, filter & list products | Public |
| `GET` | `/api/products/:id` | Get single product | Public |
| `POST` | `/api/products` | Create product | Admin |
| `PUT` | `/api/products/:id` | Update product & pricing | Admin |
| `PATCH`| `/api/products/:id/inventory` | Adjust stock units | Admin |
| `DELETE`| `/api/products/:id` | Delete / archive product | Admin |
| `GET` | `/api/categories` | List all categories with product counts | Public |
| `POST` | `/api/categories` | Create new category | Admin |

### Shopping Cart (`/api/cart`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | Get current cart with computed tax & shipping | Bearer JWT |
| `POST` | `/api/cart/items` | Add product to cart (validates inventory) | Bearer JWT |
| `PUT` | `/api/cart/items/:itemId` | Update cart item quantity | Bearer JWT |
| `DELETE`| `/api/cart/items/:itemId` | Remove item from cart | Bearer JWT |
| `DELETE`| `/api/cart` | Empty shopping cart | Bearer JWT |

### Orders & Payments (`/api/orders`, `/api/payments`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders/checkout` | Create order & get Stripe session | Bearer JWT |
| `GET` | `/api/orders` | Customer's order history | Bearer JWT |
| `GET` | `/api/orders/:id` | Order details & receipt | Bearer JWT |
| `POST` | `/api/payments/webhook` | Stripe webhook listener | Stripe Signature |
| `POST` | `/api/payments/confirm-simulated` | Instant test payment confirmation | Bearer JWT / Public |

### Admin Control (`/api/admin`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Executive KPI analytics & low stock warnings | Admin |
| `GET` | `/api/admin/orders` | View all customer orders | Admin |
| `PATCH`| `/api/admin/orders/:id/status`| Update status (`PAID`, `SHIPPED`, `DELIVERED`, etc.) | Admin |
| `GET` | `/api/admin/users` | List registered customers | Admin |

---

## Tech Stack & Architecture

- **Backend Runtime**: Node.js & Express.js
- **Database & ORM**: SQLite with Prisma Client
- **Security**: JWT (`jsonwebtoken`), `bcryptjs`, `helmet`, `cors`, input sanitization with `zod`
- **Payments**: Stripe API SDK (`stripe`) + Local Sandbox Simulator
- **API Documentation**: OpenAPI 3.0 / Swagger UI (`swagger-ui-express`, `swagger-jsdoc`)
- **Frontend Views**: HTML5, Tailwind CSS, FontAwesome 6, Vanilla JavaScript with REST fetch API
- **Testing**: Node.js built-in test runner (`node:test`, `node:assert`) & `supertest`
