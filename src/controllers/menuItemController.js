const db = require('../models');
const MenuItem = db.MenuItem;
const Restaurant = db.Restaurant;

// @desc    Create menu item
// @route   POST /api/menu-items
// @access  Private (Vendor only)
const createMenuItem = async (req, res) => {
    try {
        const vendorId = req.user.id;

        // Check if vendor has a restaurant
        const restaurant = await Restaurant.findOne({
            where: { vendor_id: vendorId }
        });

        if (!restaurant) {
            return res.status(404).json({
                message: 'You need to create a restaurant first'
            });
        }

        const {
            name,
            description,
            price,
            discount_price,
            category_id,
            image_url,
            is_available,
            is_popular,
            preparation_time
        } = req.body;

        const menuItem = await MenuItem.create({
            restaurant_id: restaurant.id,
            name,
            description,
            price,
            discount_price,
            category_id,
            image_url,
            is_available: is_available !== undefined ? is_available : true,
            is_popular: is_popular || false,
            preparation_time: preparation_time || 15
        });

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            menuItem
        });

    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get menu items by restaurant
// @route   GET /api/menu-items/restaurant/:restaurantId
// @access  Public
const getMenuItemsByRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { category_id, is_available } = req.query;

        let whereCondition = { restaurant_id: restaurantId };

        if (category_id) {
            whereCondition.category_id = category_id;
        }
        if (is_available !== undefined) {
            whereCondition.is_available = is_available === 'true';
        }

        const menuItems = await MenuItem.findAll({
            where: whereCondition,
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            count: menuItems.length,
            menuItems
        });

    } catch (error) {
        console.error('Get menu items error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update menu item
// @route   PUT /api/menu-items/:id
// @access  Private (Vendor only)
const updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const vendorId = req.user.id;

        const menuItem = await MenuItem.findByPk(id, {
            include: [{ model: Restaurant, as: 'restaurant' }]
        });

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        // Check if vendor owns this restaurant
        if (menuItem.restaurant.vendor_id !== vendorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const {
            name,
            description,
            price,
            discount_price,
            category_id,
            image_url,
            is_available,
            is_popular,
            preparation_time
        } = req.body;

        await menuItem.update({
            name: name || menuItem.name,
            description: description !== undefined ? description : menuItem.description,
            price: price || menuItem.price,
            discount_price: discount_price !== undefined ? discount_price : menuItem.discount_price,
            category_id: category_id !== undefined ? category_id : menuItem.category_id,
            image_url: image_url !== undefined ? image_url : menuItem.image_url,
            is_available: is_available !== undefined ? is_available : menuItem.is_available,
            is_popular: is_popular !== undefined ? is_popular : menuItem.is_popular,
            preparation_time: preparation_time || menuItem.preparation_time
        });

        res.json({
            success: true,
            message: 'Menu item updated successfully',
            menuItem
        });

    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete menu item
// @route   DELETE /api/menu-items/:id
// @access  Private (Vendor only)
const deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const vendorId = req.user.id;

        const menuItem = await MenuItem.findByPk(id, {
            include: [{ model: Restaurant, as: 'restaurant' }]
        });

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        // Check if vendor owns this restaurant
        if (menuItem.restaurant.vendor_id !== vendorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await menuItem.destroy();

        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });

    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Toggle menu item availability
// @route   PATCH /api/menu-items/:id/toggle
// @access  Private (Vendor only)
const toggleMenuItemAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const vendorId = req.user.id;

        const menuItem = await MenuItem.findByPk(id, {
            include: [{ model: Restaurant, as: 'restaurant' }]
        });

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        if (menuItem.restaurant.vendor_id !== vendorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await menuItem.update({
            is_available: !menuItem.is_available
        });

        res.json({
            success: true,
            message: `Menu item is now ${menuItem.is_available ? 'available' : 'unavailable'}`,
            is_available: menuItem.is_available
        });

    } catch (error) {
        console.error('Toggle menu item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createMenuItem,
    getMenuItemsByRestaurant,
    updateMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability
};