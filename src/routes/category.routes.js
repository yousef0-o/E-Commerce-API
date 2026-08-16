const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const { validate, createCategorySchema } = require('../middlewares/validate.middleware');

/**
 * @route   GET /api/categories
 * @desc    Get all categories with active product count
 * @access  Public
 */
router.get('/', categoryController.getAllCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category details with its products
 * @access  Public
 */
router.get('/:id', categoryController.getCategory);

/**
 * @route   POST /api/categories
 * @desc    Create new category (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createCategorySchema),
  categoryController.createCategory
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category (Admin only)
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(createCategorySchema.partial()),
  categoryController.updateCategory
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, categoryController.deleteCategory);

module.exports = router;
