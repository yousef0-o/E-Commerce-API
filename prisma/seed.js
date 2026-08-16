const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users
  const passwordHashAdmin = await bcrypt.hash('Admin@123', 10);
  const passwordHashCustomer = await bcrypt.hash('Customer@123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Store Administrator',
      email: 'admin@ecommerce.com',
      passwordHash: passwordHashAdmin,
      role: 'ADMIN',
      phone: '+1 (555) 019-2834',
      address: '100 Enterprise Way, Suite 400, San Francisco, CA 94105',
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: 'Jane Doe',
      email: 'customer@ecommerce.com',
      passwordHash: passwordHashCustomer,
      role: 'CUSTOMER',
      phone: '+1 (555) 342-8910',
      address: '742 Evergreen Terrace, Springfield, OR 97477',
    },
  });

  // Create initial empty cart for customer
  await prisma.cart.create({
    data: {
      userId: customer.id,
    },
  });

  console.log(`👤 Users created: Admin (${admin.email}), Customer (${customer.email})`);

  // 3. Create Categories
  const categoriesData = [
    {
      name: 'Electronics & Gadgets',
      slug: 'electronics',
      description: 'Cutting-edge electronics, audio, computing, and smart devices.',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Apparel & Fashion',
      slug: 'apparel',
      description: 'Premium everyday streetwear, athletic apparel, and timeless accessories.',
      imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Home & Living',
      slug: 'home-living',
      description: 'Modern furniture, minimalist decor, kitchen essentials, and workspace upgrades.',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=80',
    },
    {
      name: 'Fitness & Outdoors',
      slug: 'fitness-outdoors',
      description: 'High-performance gym gear, adventure equipment, and hydration gear.',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
    },
  ];

  const createdCategories = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    createdCategories[cat.slug] = created;
  }
  console.log(`📦 Created ${categoriesData.length} categories.`);

  // 4. Create Products
  const productsData = [
    // Electronics
    {
      name: 'AcousticPro ANC Wireless Headphones',
      slug: 'acousticpro-anc-headphones',
      description: 'Industry-leading hybrid active noise cancellation, 40-hour battery life, high-res audio drivers, and ultra-plush memory foam ear cushions.',
      price: 249.99,
      stock: 35,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['electronics'].id,
    },
    {
      name: 'Vortex Mechanical Gaming Keyboard',
      slug: 'vortex-mechanical-keyboard',
      description: 'Custom hot-swappable linear switches, per-key RGB backlighting, aircraft-grade aluminum top plate, and sound-dampening silicone gaskets.',
      price: 129.50,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['electronics'].id,
    },
    {
      name: 'UltraWide 34" Curved 144Hz Monitor',
      slug: 'ultrawide-34-curved-monitor',
      description: 'Immersive 3440x1440 WQHD HDR display with 1ms response time, 99% sRGB color gamut, and integrated USB-C 90W power delivery dock.',
      price: 499.00,
      stock: 15,
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['electronics'].id,
    },
    {
      name: 'PulseFlow Smart Fitness Watch',
      slug: 'pulseflow-smart-fitness-watch',
      description: 'Continuous heart rate, SpO2 sensor, built-in GPS, sleep analytics, 7-day battery life, and 50m water resistance.',
      price: 179.99,
      stock: 40,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['electronics'].id,
    },
    // Apparel
    {
      name: 'Merino Wool Minimalist Hoodie',
      slug: 'merino-wool-minimalist-hoodie',
      description: '100% sustainably sourced extra-fine merino wool. Naturally odor-resistant, temperature-regulating, and tailored for effortless layering.',
      price: 89.00,
      stock: 60,
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['apparel'].id,
    },
    {
      name: 'Urban Transit Waterproof Backpack',
      slug: 'urban-transit-waterproof-backpack',
      description: '25L weatherproof roll-top backpack with dedicated 16-inch padded laptop compartment, magnetic Fidlock buckle, and hidden passport pocket.',
      price: 110.00,
      stock: 28,
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['apparel'].id,
    },
    {
      name: 'Classic Polarized Aviator Sunglasses',
      slug: 'classic-polarized-aviator-sunglasses',
      description: 'Handcrafted titanium frame with scratch-resistant polarized lenses providing 100% UVA/UVB protection.',
      price: 65.00,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['apparel'].id,
    },
    // Home & Living
    {
      name: 'AromaPulse Ultrasonic Ceramic Diffuser',
      slug: 'aromapulse-ultrasonic-ceramic-diffuser',
      description: 'Hand-cast ceramic stone cover, ambient warm LED illumination, whisper-quiet ultrasonic atomization with 8-hour continuous mist timer.',
      price: 54.00,
      stock: 30,
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['home-living'].id,
    },
    {
      name: 'Artisan Pour-Over Gooseneck Kettle',
      slug: 'artisan-pour-over-gooseneck-kettle',
      description: 'Precision spout for controlled flow rate, built-in analog thermometer, matte black stainless steel finish, and ergonomic walnut handle.',
      price: 48.50,
      stock: 22,
      imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['home-living'].id,
    },
    {
      name: 'Ergonomic Memory Foam Lumbar Support Pillow',
      slug: 'ergonomic-lumbar-support-pillow',
      description: 'High-density contoured memory foam designed by orthopedic physiotherapists with breathable 3D mesh cover and adjustable buckle straps.',
      price: 39.99,
      stock: 75,
      imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['home-living'].id,
    },
    // Fitness & Outdoors
    {
      name: 'Apex Grip Pro Adjustable Dumbbell Set',
      slug: 'apex-grip-pro-adjustable-dumbbells',
      description: 'Quick-dial weight selection from 5 lbs to 52.5 lbs per dumbbell. Replaces 15 sets of weights in a compact, durable steel footprint.',
      price: 349.99,
      stock: 12,
      imageUrl: 'https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['fitness-outdoors'].id,
    },
    {
      name: 'HydroShield Insulated Stainless Steel Bottle (32oz)',
      slug: 'hydroshield-insulated-bottle-32oz',
      description: 'Triple-wall vacuum insulation keeps drinks ice cold for 24 hours or piping hot for 12 hours. Leak-proof chug cap with silicone bumper.',
      price: 32.00,
      stock: 100,
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80',
      categoryId: createdCategories['fitness-outdoors'].id,
    },
  ];

  for (const prod of productsData) {
    await prisma.product.create({ data: prod });
  }
  console.log(`🛍️ Created ${productsData.length} products with stock and images.`);

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
