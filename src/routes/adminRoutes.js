const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.toggleUserStatus);
router.get('/users/:id/orders', adminController.getUserOrders);

// Restaurants
router.get('/restaurants', adminController.getRestaurants);
router.put('/restaurants/:id/status', adminController.toggleRestaurantStatus);

// Menu Items
router.get('/menu-items', adminController.getMenuItems);
router.put('/menu-items/:id/status', adminController.toggleMenuItemStatus);

// Orders
router.get('/orders', adminController.getOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.post('/orders/:id/refund', adminController.refundOrder);

// Vouchers
router.get('/vouchers', adminController.getVouchers);
router.post('/vouchers', adminController.createVoucher);
router.put('/vouchers/:id/status', adminController.toggleVoucherStatus);

module.exports = router;
