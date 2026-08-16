const { z } = require('zod');

/**
 * Higher-order middleware function to validate request body, query, or params with a Zod schema
 */
const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errorMessages,
        });
      }
      next(error);
    }
  };
};

// Validation Schemas

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

const createProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().min(5, 'Product description is required'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stock: z.coerce.number().int().nonnegative('Stock cannot be negative'),
  categoryId: z.string().min(1, 'Category ID is required'),
  imageUrl: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
});

const updateProductSchema = createProductSchema.partial();

const updateInventorySchema = z.object({
  stock: z.coerce.number().int().nonnegative('Stock must be an integer >= 0'),
});

const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  description: z.string().optional(),
  imageUrl: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
});

const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1').default(1),
});

const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
});

const checkoutSchema = z.object({
  shippingAddress: z.string().min(5, 'Shipping address is required (at least 5 characters)'),
  phone: z.string().optional(),
  paymentMethod: z.enum(['card', 'stripe_checkout', 'simulated']).default('card'),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  createProductSchema,
  updateProductSchema,
  updateInventorySchema,
  createCategorySchema,
  addToCartSchema,
  updateCartItemSchema,
  checkoutSchema,
  updateOrderStatusSchema,
};
