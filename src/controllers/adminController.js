const { Op } = require('sequelize');
const db = require('../models');
const { User, Restaurant, MenuItem, Order, OrderItem, Voucher, sequelize } = db;

// --- Dashboard ---
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.count({ where: { role: 'user' } });
        const totalRestaurants = await Restaurant.count();
        const totalOrders = await Order.count();
        
        // Caculate total revenue from completed orders
        const revenueResult = await Order.findAll({
            where: { status: 'delivered', payment_status: 'paid' },
            attributes: [
                [sequelize.fn('sum', sequelize.col('total_amount')), 'totalRevenue']
            ],
            raw: true
        });
        const totalRevenue = revenueResult[0].totalRevenue || 0;

        // Top restaurants
        const topRestaurants = await Restaurant.findAll({
            order: [['rating', 'DESC'], ['total_ratings', 'DESC']],
            limit: 5
        });

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalRestaurants,
                totalOrders,
                totalRevenue
            },
            topRestaurants
        });
    } catch (error) {
        console.error('Admin Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Users ---
const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: { [Op.ne]: 'admin' } },
            attributes: { exclude: ['password_hash'] },
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Admin Get Users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        if (user.role === 'admin') return res.status(403).json({ message: 'Cannot lock admin' });

        user.is_active = !user.is_active;
        await user.save();
        res.json({ success: true, user: { id: user.id, is_active: user.is_active } });
    } catch (error) {
        console.error('Admin Toggle User Status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserOrders = async (req, res) => {
    try {
        const { id } = req.params;
        const orders = await Order.findAll({
            where: { user_id: id },
            include: [{ model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Admin Get User Orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Restaurants ---
const getRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.findAll({
            include: [{ model: User, as: 'vendor', attributes: ['id', 'email', 'full_name'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, restaurants });
    } catch (error) {
        console.error('Admin Get Restaurants error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const toggleRestaurantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const restaurant = await Restaurant.findByPk(id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        restaurant.is_active = !restaurant.is_active;
        await restaurant.save();
        res.json({ success: true, restaurant: { id: restaurant.id, is_active: restaurant.is_active } });
    } catch (error) {
        console.error('Admin Toggle Restaurant Status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Menu Items ---
const getMenuItems = async (req, res) => {
    try {
        const menuItems = await MenuItem.findAll({
            include: [{ model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, menuItems });
    } catch (error) {
        console.error('Admin Get Menu Items error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const toggleMenuItemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await MenuItem.findByPk(id);
        if (!item) return res.status(404).json({ message: 'Menu item not found' });

        item.is_available = !item.is_available;
        await item.save();
        res.json({ success: true, item: { id: item.id, is_available: item.is_available } });
    } catch (error) {
        console.error('Admin Toggle Menu Item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Orders ---
const getOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                { model: User, as: 'user', attributes: ['id', 'email', 'full_name'] },
                { model: Restaurant, as: 'restaurant', attributes: ['id', 'name'] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Admin Get Orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const order = await Order.findByPk(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.status = status;
        await order.save();
        
        // Optional: emit socket event if we want realtime updates for admin actions
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${order.user_id}`).emit('orderStatusUpdated', {
                orderId: order.id,
                status: order.status
            });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('Admin Update Order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const refundOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByPk(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.payment_status !== 'paid') {
            return res.status(400).json({ message: 'Only paid orders can be refunded' });
        }

        // Mock refund logic
        order.payment_status = 'refunded'; // Assuming 'refunded' might be added to enum, or we can just set status to 'cancelled'
        order.status = 'cancelled';
        await order.save();

        res.json({ success: true, message: 'Order refunded successfully', order });
    } catch (error) {
        console.error('Admin Refund Order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- Vouchers ---
const getVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.findAll({
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, vouchers });
    } catch (error) {
        console.error('Admin Get Vouchers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const toggleVoucherStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const voucher = await Voucher.findByPk(id);
        if (!voucher) return res.status(404).json({ message: 'Voucher not found' });

        voucher.is_active = !voucher.is_active;
        await voucher.save();
        res.json({ success: true, voucher: { id: voucher.id, is_active: voucher.is_active } });
    } catch (error) {
        console.error('Admin Toggle Voucher Status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createVoucher = async (req, res) => {
    try {
        const { code, name, description, discount_type, discount_value, min_order_amount, max_discount, start_date, end_date, usage_limit } = req.body;
        
        // Basic validation
        if (!code || !name || !discount_value || !start_date || !end_date) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const existingVoucher = await Voucher.findOne({ where: { code } });
        if (existingVoucher) {
            return res.status(400).json({ message: 'Voucher code already exists' });
        }

        const voucher = await Voucher.create({
            code,
            name,
            description,
            discount_type: discount_type || 'percentage',
            discount_value,
            min_order_amount: min_order_amount || 0,
            max_discount: max_discount || null,
            start_date,
            end_date,
            usage_limit: usage_limit || 0,
            is_active: true
        });

        res.status(201).json({ success: true, voucher });
    } catch (error) {
        console.error('Admin Create Voucher error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getDashboardStats,
    getUsers,
    toggleUserStatus,
    getUserOrders,
    getRestaurants,
    toggleRestaurantStatus,
    getMenuItems,
    toggleMenuItemStatus,
    getOrders,
    updateOrderStatus,
    refundOrder,
    getVouchers,
    toggleVoucherStatus,
    createVoucher
};
