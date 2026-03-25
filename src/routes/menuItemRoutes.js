const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    createMenuItem,
    getMenuItemsByRestaurant,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability
} = require('../controllers/menuItemController');

// Validation rules
const menuItemValidation = [
    body('name').notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
];

// Public routes
router.get('/restaurant/:restaurantId', getMenuItemsByRestaurant);

// Vendor only routes
router.use(authenticateToken);
router.use(authorizeRoles('vendor'));

router.post('/', menuItemValidation, createMenuItem);
router.put('/:id', menuItemValidation, updateMenuItem);
router.delete('/:id', deleteMenuItem);
router.patch('/:id/toggle', toggleMenuItemAvailability);

module.exports = router;