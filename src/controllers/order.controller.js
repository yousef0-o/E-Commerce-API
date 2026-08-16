const orderService = require('../services/order.service');

const checkout = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, successUrl, cancelUrl } = req.body;
    const result = await orderService.checkoutFromCart({
      userId: req.user.id,
      shippingAddress,
      paymentMethod,
      successUrl,
      cancelUrl,
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const result = await orderService.getUserOrders(req.user.id, req.query);
    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const order = await orderService.getOrderById(req.params.id, req.user.id, isAdmin);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkout,
  getMyOrders,
  getOrderById,
};
