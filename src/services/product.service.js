const prisma = require('../config/db');

/**
 * Generate URL-friendly slug
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * List products with search, category filtering, price filtering, sorting, and pagination
 */
const listProducts = async ({
  search,
  category,
  minPrice,
  maxPrice,
  sort = 'newest',
  page = 1,
  limit = 12,
  inStockOnly = false,
  includeInactive = false,
}) => {
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
  const skip = (pageNumber - 1) * pageSize;

  const where = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { name: { contains: term } },
      { description: { contains: term } },
    ];
  }

  if (category) {
    where.category = {
      OR: [
        { id: category },
        { slug: category.toLowerCase() },
        { name: { contains: category } },
      ],
    };
  }

  if (minPrice !== undefined && minPrice !== '' && !isNaN(minPrice)) {
    where.price = { ...(where.price || {}), gte: parseFloat(minPrice) };
  }

  if (maxPrice !== undefined && maxPrice !== '' && !isNaN(maxPrice)) {
    where.price = { ...(where.price || {}), lte: parseFloat(maxPrice) };
  }

  if (inStockOnly === true || inStockOnly === 'true') {
    where.stock = { gt: 0 };
  }

  // Sorting
  let orderBy = { createdAt: 'desc' };
  if (sort === 'price_asc') {
    orderBy = { price: 'asc' };
  } else if (sort === 'price_desc') {
    orderBy = { price: 'desc' };
  } else if (sort === 'name_asc') {
    orderBy = { name: 'asc' };
  } else if (sort === 'name_desc') {
    orderBy = { name: 'desc' };
  } else if (sort === 'stock_desc') {
    orderBy = { stock: 'desc' };
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
  ]);

  return {
    products,
    pagination: {
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: pageNumber * pageSize < total,
      hasPrevPage: pageNumber > 1,
    },
  };
};

/**
 * Get product by ID or Slug
 */
const getProductById = async (idOrSlug) => {
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      category: true,
    },
  });

  if (!product) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  return product;
};

/**
 * Create a new product
 */
const createProduct = async (data) => {
  // Validate category existence
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category) {
    const error = new Error('Selected category does not exist.');
    error.statusCode = 400;
    throw error;
  }

  let slug = generateSlug(data.name);
  // Ensure slug uniqueness
  let counter = 1;
  let uniqueSlug = slug;
  while (await prisma.product.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${counter++}`;
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: uniqueSlug,
      description: data.description,
      price: data.price,
      stock: data.stock !== undefined ? data.stock : 0,
      imageUrl: data.imageUrl || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      categoryId: data.categoryId,
    },
    include: {
      category: true,
    },
  });

  return product;
};

/**
 * Update an existing product
 */
const updateProduct = async (id, data) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = { ...data };

  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      const error = new Error('Selected category does not exist.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.name && data.name !== product.name) {
    let slug = generateSlug(data.name);
    let counter = 1;
    let uniqueSlug = slug;
    while (
      await prisma.product.findFirst({
        where: { slug: uniqueSlug, NOT: { id } },
      })
    ) {
      uniqueSlug = `${slug}-${counter++}`;
    }
    updateData.slug = uniqueSlug;
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
    },
  });

  return updatedProduct;
};

/**
 * Delete product (or deactivate if associated with orders)
 */
const deleteProduct = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: { orderItems: true },
      },
    },
  });

  if (!product) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  // If already part of past orders, soft delete so historic receipts remain valid
  if (product._count.orderItems > 0) {
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      message: 'Product is referenced in existing orders; archived/deactivated successfully.',
      softDeleted: true,
    };
  }

  await prisma.product.delete({
    where: { id },
  });

  return {
    message: 'Product deleted permanently.',
    softDeleted: false,
  };
};

/**
 * Update stock inventory level
 */
const updateInventory = async (id, stock) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { stock: parseInt(stock, 10) },
    include: {
      category: true,
    },
  });

  return updated;
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateInventory,
};
