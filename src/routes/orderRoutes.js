const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    createOrder,
    getMyOrders,
    getOrderById,
    getVendorOrders,
    updateOrderStatus,
    trackOrder,
    cancelOrder
} = require('../controllers/orderController');

// Validation rules
const createOrderValidation = [
    body('delivery_address').notEmpty().withMessage('Delivery address is required'),
    body('payment_method').isIn(['cash', 'stripe']).withMessage('Invalid payment method')
];

// User routes
router.get('/my-orders', authenticateToken, authorizeRoles('user'), getMyOrders);
router.get('/:id/track', authenticateToken, authorizeRoles('user'), trackOrder);
router.put('/:id/cancel', authenticateToken, authorizeRoles('user'), cancelOrder);

// Vendor routes
router.get('/vendor/orders', authenticateToken, authorizeRoles('vendor'), getVendorOrders);
router.put('/:id/status', authenticateToken, authorizeRoles('vendor'), updateOrderStatus);

// Shared routes (both user and vendor can access their own orders)
router.get('/:id', authenticateToken, getOrderById);
router.post('/', authenticateToken, authorizeRoles('user'), createOrderValidation, createOrder);

module.exports = router;