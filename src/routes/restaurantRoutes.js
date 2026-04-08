const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    createRestaurant,
    getMyRestaurant,
    updateRestaurant,
    getAllRestaurants,
    getRestaurantById,
    toggleRestaurantStatus
} = require('../controllers/restaurantController');

// Validation rules for creating/updating restaurant
const restaurantValidation = [
    body('name').notEmpty().withMessage('Restaurant name is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
];

// ========== QUAN TRỌNG: Đặt route cụ thể TRƯỚC route động ==========

// Public routes
router.get('/', getAllRestaurants);

// Vendor only routes - ĐẶT TRƯỚC route /:id
router.use(authenticateToken);
router.use(authorizeRoles('vendor'));

router.post('/', restaurantValidation, createRestaurant);
router.get('/my-restaurant', getMyRestaurant);  // Phải ở TRƯỚC /:id
router.put('/', restaurantValidation, updateRestaurant);
router.patch('/toggle-status', toggleRestaurantStatus);

// Route động (phải ở SAU cùng)
router.get('/:id', getRestaurantById);

module.exports = router;