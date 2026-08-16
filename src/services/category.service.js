const prisma = require('../config/db');

const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

const getAllCategories = async () => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          products: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    imageUrl: cat.imageUrl,
    productCount: cat._count.products,
  }));
};

const getCategoryById = async (idOrSlug) => {
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      products: {
        where: { isActive: true },
      },
    },
  });

  if (!category) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    throw error;
  }

  return category;
};

const createCategory = async (data) => {
  const slug = generateSlug(data.name);

  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ name: data.name }, { slug }],
    },
  });

  if (existing) {
    const error = new Error('A category with this name or slug already exists.');
    error.statusCode = 409;
    throw error;
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
    },
  });

  return category;
};

const updateCategory = async (id, data) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    throw error;
  }

  const updateData = { ...data };
  if (data.name && data.name !== category.name) {
    updateData.slug = generateSlug(data.name);
  }

  const updated = await prisma.category.update({
    where: { id },
    data: updateData,
  });

  return updated;
};

const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    const error = new Error('Category not found.');
    error.statusCode = 404;
    throw error;
  }

  if (category._count.products > 0) {
    const error = new Error('Cannot delete category containing existing products.');
    error.statusCode = 400;
    throw error;
  }

  await prisma.category.delete({
    where: { id },
  });

  return { message: 'Category deleted successfully' };
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
