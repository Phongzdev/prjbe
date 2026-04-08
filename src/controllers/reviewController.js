const db = require('../models');
const Review = db.Review;
const Order = db.Order;
const Restaurant = db.Restaurant;

// @desc    Create review
// @route   POST /api/reviews
// @access  Private (User only)
const createReview = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const { order_id, rating, comment, images } = req.body;
        const userId = req.user.id;

        // Check if order exists and belongs to user
        const order = await Order.findByPk(order_id, {
            include: [{ model: Restaurant, as: 'restaurant' }],
            transaction: t
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Check if order is delivered
        if (order.status !== 'delivered') {
            return res.status(400).json({ message: 'You can only review delivered orders' });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({
            where: { order_id },
            transaction: t
        });

        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this order' });
        }

        // Create review
        const review = await Review.create({
            order_id,
            user_id: userId,
            restaurant_id: order.restaurant_id,
            rating,
            comment,
            images: images || []
        }, { transaction: t });

        // Update restaurant rating
        const allReviews = await Review.findAll({
            where: { restaurant_id: order.restaurant_id },
            attributes: ['rating'],
            transaction: t
        });

        const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / allReviews.length;

        await Restaurant.update({
            rating: avgRating,
            total_ratings: allReviews.length
        }, {
            where: { id: order.restaurant_id },
            transaction: t
        });

        await t.commit();

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review
        });

    } catch (error) {
        await t.rollback();
        console.error('Create review error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get reviews by restaurant
// @route   GET /api/reviews/restaurant/:restaurantId
// @access  Public
const getReviewsByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const reviews = await Review.findAndCountAll({
            where: { restaurant_id: restaurantId },
            include: [
                {
                    model: db.User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'avatar_url']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            reviews: reviews.rows,
            total: reviews.count,
            page: parseInt(page),
            totalPages: Math.ceil(reviews.count / limit)
        });

    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
const getMyReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({
            where: { user_id: req.user.id },
            include: [
                {
                    model: db.Restaurant,
                    as: 'restaurant',
                    attributes: ['id', 'name', 'image_url']
                },
                {
                    model: db.Order,
                    as: 'order',
                    attributes: ['order_number', 'total_amount']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            reviews
        });

    } catch (error) {
        console.error('Get my reviews error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (User only)
const deleteReview = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const review = await Review.findByPk(id, { transaction: t });

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await review.destroy({ transaction: t });

        // Update restaurant rating
        const allReviews = await Review.findAll({
            where: { restaurant_id: review.restaurant_id },
            attributes: ['rating'],
            transaction: t
        });

        if (allReviews.length > 0) {
            const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
            const avgRating = totalRating / allReviews.length;

            await Restaurant.update({
                rating: avgRating,
                total_ratings: allReviews.length
            }, {
                where: { id: review.restaurant_id },
                transaction: t
            });
        } else {
            await Restaurant.update({
                rating: 0,
                total_ratings: 0
            }, {
                where: { id: review.restaurant_id },
                transaction: t
            });
        }

        await t.commit();

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        await t.rollback();
        console.error('Delete review error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createReview,
    getReviewsByRestaurant,
    getMyReviews,
    deleteReview
};