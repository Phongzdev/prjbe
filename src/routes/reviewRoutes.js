const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    createReview,
    getReviewsByRestaurant,
    getMyReviews,
    deleteReview
} = require('../controllers/reviewController');

const reviewValidation = [
    body('order_id').notEmpty().withMessage('Order ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString()
];

// Public routes
router.get('/restaurant/:restaurantId', getReviewsByRestaurant);

// User only routes
router.use(authenticateToken);
router.use(authorizeRoles('user'));

router.post('/', reviewValidation, createReview);
router.get('/my-reviews', getMyReviews);
router.delete('/:id', deleteReview);

module.exports = router;