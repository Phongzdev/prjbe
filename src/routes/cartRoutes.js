const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} = require('../controllers/cartController');

// Validation rules
const addToCartValidation = [
    body('menu_item_id').notEmpty().withMessage('Menu item ID is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

const updateCartItemValidation = [
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// All cart routes require authentication and user role
router.use(authenticateToken);
router.use(authorizeRoles('user'));

router.get('/', getCart);
router.post('/items', addToCartValidation, addToCart);
router.put('/items/:itemId', updateCartItemValidation, updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;