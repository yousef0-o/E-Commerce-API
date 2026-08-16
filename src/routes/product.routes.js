const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, requireAdmin, optionalAuth } = require('../middlewares/auth.middleware');
const {
  validate,
  createProductSchema,
  updateProductSchema,
  updateInventorySchema,
} = require('../middlewares/validate.middleware');

/**
 * @route   GET /api/products
 * @desc    Get paginated products with search and filtering
 * @access  Public
 */
router.get('/', optionalAuth, productController.getAllProducts);

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID or slug
 * @access  Public
 */
router.get('/:id', productController.getProduct);

/**
 * @route   POST /api/products
 * @desc    Create a new product (Admin only)
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createProductSchema),
  productController.createProduct
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update an existing product (Admin only)
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate(updateProductSchema),
  productController.updateProduct
);

/**
 * @route   PATCH /api/products/:id/inventory
 * @desc    Quick update product stock level (Admin only)
 * @access  Private (Admin)
 */
router.patch(
  '/:id/inventory',
  authenticate,
  requireAdmin,
  validate(updateInventorySchema),
  productController.updateInventory
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete or deactivate product (Admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, requireAdmin, productController.deleteProduct);

module.exports = router;
