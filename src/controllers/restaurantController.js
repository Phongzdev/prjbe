const db = require('../models');
const Restaurant = db.Restaurant;
const User = db.User;

// @desc    Create restaurant (for vendor)
// @route   POST /api/restaurants
// @access  Private (Vendor only)
const createRestaurant = async (req, res) => {
    try {
        const vendorId = req.user.id;

        // Check if user is vendor
        if (req.user.role !== 'vendor') {
            return res.status(403).json({
                message: 'Only vendors can create restaurants'
            });
        }

        // Check if vendor already has a restaurant
        const existingRestaurant = await Restaurant.findOne({
            where: { vendor_id: vendorId }
        });

        if (existingRestaurant) {
            return res.status(400).json({
                message: 'You already have a restaurant'
            });
        }

        // Create restaurant
        const {
            name,
            description,
            address,
            latitude,
            longitude,
            phone,
            image_url,
            opening_time,
            closing_time
        } = req.body;

        const restaurant = await Restaurant.create({
            vendor_id: vendorId,
            name,
            description,
            address,
            latitude,
            longitude,
            phone,
            image_url,
            opening_time,
            closing_time,
            is_active: true
        });

        res.status(201).json({
            success: true,
            message: 'Restaurant created successfully',
            restaurant
        });

    } catch (error) {
        console.error('Create restaurant error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get my restaurant (for current vendor)
// @route   GET /api/restaurants/my-restaurant
// @access  Private (Vendor only)
const getMyRestaurant = async (req, res) => {
    try {
        const vendorId = req.user.id;

        const restaurant = await Restaurant.findOne({
            where: { vendor_id: vendorId },
            include: [
                {
                    model: User,
                    as: 'vendor',
                    attributes: ['id', 'full_name', 'email', 'phone']
                }
            ]
        });

        if (!restaurant) {
            return res.status(404).json({
                message: 'Restaurant not found. Please create one first.'
            });
        }

        res.json({
            success: true,
            restaurant
        });

    } catch (error) {
        console.error('Get my restaurant error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update restaurant
// @route   PUT /api/restaurants
// @access  Private (Vendor only)
const updateRestaurant = async (req, res) => {
    try {
        const vendorId = req.user.id;

        const restaurant = await Restaurant.findOne({
            where: { vendor_id: vendorId }
        });

        if (!restaurant) {
            return res.status(404).json({
                message: 'Restaurant not found'
            });
        }

        // Update allowed fields
        const {
            name,
            description,
            address,
            latitude,
            longitude,
            phone,
            image_url,
            opening_time,
            closing_time,
            is_active
        } = req.body;

        await restaurant.update({
            name: name || restaurant.name,
            description: description !== undefined ? description : restaurant.description,
            address: address || restaurant.address,
            latitude: latitude !== undefined ? latitude : restaurant.latitude,
            longitude: longitude !== undefined ? longitude : restaurant.longitude,
            phone: phone || restaurant.phone,
            image_url: image_url !== undefined ? image_url : restaurant.image_url,
            opening_time: opening_time || restaurant.opening_time,
            closing_time: closing_time || restaurant.closing_time,
            is_active: is_active !== undefined ? is_active : restaurant.is_active
        });

        res.json({
            success: true,
            message: 'Restaurant updated successfully',
            restaurant
        });

    } catch (error) {
        console.error('Update restaurant error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get all restaurants (for users)
// @route   GET /api/restaurants
// @access  Public
const getAllRestaurants = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, is_active } = req.query;
        const offset = (page - 1) * limit;

        // Build where condition
        let whereCondition = {};

        if (is_active !== undefined) {
            whereCondition.is_active = is_active === 'true';
        }

        if (search) {
            whereCondition.name = {
                [db.Sequelize.Op.iLike]: `%${search}%`
            };
        }

        const restaurants = await Restaurant.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: User,
                    as: 'vendor',
                    attributes: ['id', 'full_name', 'email']
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['rating', 'DESC'], ['created_at', 'DESC']]
        });

        res.json({
            success: true,
            restaurants: restaurants.rows,
            total: restaurants.count,
            page: parseInt(page),
            totalPages: Math.ceil(restaurants.count / limit)
        });

    } catch (error) {
        console.error('Get all restaurants error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get restaurant by ID
// @route   GET /api/restaurants/:id
// @access  Public
const getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params;

        const restaurant = await Restaurant.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'vendor',
                    attributes: ['id', 'full_name', 'email', 'phone']
                },
                {
                    model: db.MenuItem,
                    as: 'menu_items',
                    where: { is_available: true },
                    required: false,
                    include: [
                        {
                            model: db.Category,
                            as: 'category',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ]
        });

        if (!restaurant) {
            return res.status(404).json({
                message: 'Restaurant not found'
            });
        }

        res.json({
            success: true,
            restaurant
        });

    } catch (error) {
        console.error('Get restaurant by ID error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Toggle restaurant active status
// @route   PATCH /api/restaurants/toggle-status
// @access  Private (Vendor only)
const toggleRestaurantStatus = async (req, res) => {
    try {
        const vendorId = req.user.id;

        const restaurant = await Restaurant.findOne({
            where: { vendor_id: vendorId }
        });

        if (!restaurant) {
            return res.status(404).json({
                message: 'Restaurant not found'
            });
        }

        await restaurant.update({
            is_active: !restaurant.is_active
        });

        res.json({
            success: true,
            message: `Restaurant is now ${restaurant.is_active ? 'open' : 'closed'}`,
            is_active: restaurant.is_active
        });

    } catch (error) {
        console.error('Toggle restaurant status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createRestaurant,
    getMyRestaurant,
    updateRestaurant,
    getAllRestaurants,
    getRestaurantById,
    toggleRestaurantStatus
};