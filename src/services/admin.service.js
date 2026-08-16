const prisma = require('../config/db');
const orderService = require('./order.service');

/**
 * Get aggregated analytics for the admin dashboard
 */
const getDashboardStats = async () => {
  const [
    totalUsers,
    totalProducts,
    totalOrders,
    paidOrders,
    lowStockProducts,
    recentOrders,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.findMany({
      where: {
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      select: { totalAmount: true },
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        stock: { lte: 15 },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
        imageUrl: true,
      },
      orderBy: { stock: 'asc' },
      take: 8,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        user: { select: { name: true, email: true } },
        items: true,
      },
    }),
  ]);

  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Status breakdown
  const ordersByStatus = await prisma.order.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  return {
    metrics: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalOrders,
      totalCustomers: totalUsers,
      totalProducts,
      lowStockCount: lowStockProducts.length,
    },
    ordersByStatus: ordersByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count._all;
      return acc;
    }, {}),
    lowStockProducts,
    recentOrders,
  };
};

/**
 * Get all orders with search, status filter, and pagination
 */
const getAllOrders = async ({ status, search, page = 1, limit = 15 }) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
  const skip = (pageNumber - 1) * pageSize;

  const where = {};

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { id: { contains: term } },
      { user: { name: { contains: term } } },
      { user: { email: { contains: term } } },
      { shippingAddress: { contains: term } },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: { imageUrl: true },
            },
          },
        },
        payments: true,
      },
    }),
  ]);

  return {
    orders,
    pagination: {
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * Get all registered users with summary stats
 */
const getAllUsers = async ({ page = 1, limit = 20 }) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNumber - 1) * pageSize;

  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
    }),
  ]);

  return {
    users,
    pagination: {
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus: orderService.updateOrderStatus,
  getAllUsers,
};
