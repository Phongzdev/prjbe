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

// Public routes
router.get('/', getAllRestaurants);
router.get('/:id', getRestaurantById);

// Vendor only routes
router.use(authenticateToken);
router.use(authorizeRoles('vendor'));

router.post('/', restaurantValidation, createRestaurant);
router.get('/my-restaurant', getMyRestaurant);
router.put('/', restaurantValidation, updateRestaurant);
router.patch('/toggle-status', toggleRestaurantStatus);

module.exports = router;