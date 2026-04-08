const db = require('../models');
const Order = db.Order;
const OrderItem = db.OrderItem;
const Cart = db.Cart;
const CartItem = db.CartItem;
const MenuItem = db.MenuItem;
const Restaurant = db.Restaurant;
const User = db.User;
const { notifyOrderStatusUpdate, notifyNewOrder } = require('../socket');
const { sendOrderConfirmation, sendOrderStatusUpdate } = require('../services/emailService');
// Generate unique order number
const generateOrderNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
};

// @desc    Create order from cart
// @route   POST /api/orders
// @access  Private (User only)
const createOrder = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const userId = req.user.id;
        const { delivery_address, payment_method, notes } = req.body;

        // Validate input
        if (!delivery_address) {
            return res.status(400).json({ message: 'Delivery address is required' });
        }
        if (!payment_method || !['cash', 'stripe', 'momo'].includes(payment_method)) {
            return res.status(400).json({ message: 'Valid payment method is required' });
        }

        // Get user's cart
        const cart = await Cart.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [
                        {
                            model: MenuItem,
                            as: 'menu_item',
                            include: [
                                {
                                    model: Restaurant,
                                    as: 'restaurant'
                                }
                            ]
                        }
                    ]
                }
            ],
            transaction: t
        });

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Check if all items are available
        for (const item of cart.items) {
            if (!item.menu_item.is_available) {
                return res.status(400).json({
                    message: `${item.menu_item.name} is currently unavailable`
                });
            }
        }

        const restaurant = cart.items[0].menu_item.restaurant;
        const restaurantId = restaurant.id;

        // Calculate total amount
        let totalAmount = 0;
        const orderItems = [];

        for (const item of cart.items) {
            const price = item.menu_item.discount_price || item.menu_item.price;
            const subtotal = price * item.quantity;
            totalAmount += subtotal;

            orderItems.push({
                menu_item_id: item.menu_item_id,
                quantity: item.quantity,
                unit_price: price,
                subtotal: subtotal,
                special_instructions: item.special_instructions
            });
        }

        // Add delivery fee (optional)
        const deliveryFee = 15000; // Fixed delivery fee
        totalAmount += deliveryFee;

        // Generate order number
        const orderNumber = generateOrderNumber();

        // Create order
        const order = await Order.create({
            user_id: userId,
            restaurant_id: restaurantId,
            order_number: orderNumber,
            total_amount: totalAmount,
            delivery_address,
            delivery_fee: deliveryFee,
            payment_method,
            payment_status: payment_method === 'cash' ? 'pending' : 'pending',
            notes: notes || null,
            status: 'pending'
        }, { transaction: t });

        // Create order items
        for (const item of orderItems) {
            await OrderItem.create({
                order_id: order.id,
                ...item
            }, { transaction: t });
        }

        // Clear cart
        await CartItem.destroy({
            where: { cart_id: cart.id },
            transaction: t
        });
        await cart.update({ restaurant_id: null }, { transaction: t });

        await t.commit();

        // Get complete order with items
        const completeOrder = await Order.findByPk(order.id, {
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: MenuItem,
                            as: 'menu_item',
                            attributes: ['id', 'name', 'image_url', 'price', 'discount_price']
                        }
                    ]
                },
                {
                    model: Restaurant,
                    as: 'restaurant',
                    attributes: ['id', 'name', 'address', 'phone', 'image_url']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email', 'phone', 'address']
                }
            ]
        });
        notifyNewOrder(completeOrder, restaurantId);
        // Gửi email xác nhận (không await để không block response)
        sendOrderConfirmation(completeOrder, completeOrder.user, completeOrder.restaurant)
            .catch(err => console.error('❌ Email sending failed:', err.message));

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: completeOrder
        });

    } catch (error) {
        await t.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private (User only)
const getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;

        let whereCondition = { user_id: userId };
        if (status) {
            whereCondition.status = status;
        }

        const orders = await Order.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: MenuItem,
                            as: 'menu_item',
                            attributes: ['id', 'name', 'image_url']
                        }
                    ]
                },
                {
                    model: Restaurant,
                    as: 'restaurant',
                    attributes: ['id', 'name', 'image_url', 'address']
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            orders: orders.rows,
            total: orders.count,
            page: parseInt(page),
            totalPages: Math.ceil(orders.count / limit)
        });

    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (User or Vendor)
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const order = await Order.findByPk(id, {
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: MenuItem,
                            as: 'menu_item',
                            include: [
                                {
                                    model: Restaurant,
                                    as: 'restaurant',
                                    attributes: ['id', 'name']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Restaurant,
                    as: 'restaurant',
                    include: [
                        {
                            model: User,
                            as: 'vendor',
                            attributes: ['id', 'full_name', 'email', 'phone']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email', 'phone', 'address']
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check permissions
        if (userRole === 'user' && order.user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        if (userRole === 'vendor' && order.restaurant.vendor_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get vendor orders
// @route   GET /api/orders/vendor/orders
// @access  Private (Vendor only)
const getVendorOrders = async (req, res) => {
    try {
        const vendorId = req.user.id;
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;

        // Get vendor's restaurant
        const restaurant = await Restaurant.findOne({
            where: { vendor_id: vendorId }
        });

        if (!restaurant) {
            return res.status(404).json({
                message: 'You need to create a restaurant first'
            });
        }

        let whereCondition = { restaurant_id: restaurant.id };
        if (status) {
            whereCondition.status = status;
        }

        const orders = await Order.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: MenuItem,
                            as: 'menu_item',
                            attributes: ['id', 'name', 'image_url']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email', 'phone', 'address']
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            orders: orders.rows,
            total: orders.count,
            page: parseInt(page),
            totalPages: Math.ceil(orders.count / limit),
            restaurant: {
                id: restaurant.id,
                name: restaurant.name
            }
        });

    } catch (error) {
        console.error('Get vendor orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update order status (Vendor)
// @route   PUT /api/orders/:id/status
// @access  Private (Vendor only)
const updateOrderStatus = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const { status, estimated_delivery_time } = req.body;
        const vendorId = req.user.id;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
            });
        }

        const order = await Order.findByPk(id, {
            include: [
                {
                    model: Restaurant,
                    as: 'restaurant',
                    include: [
                        {
                            model: User,
                            as: 'vendor',
                            attributes: ['id', 'full_name', 'email']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email', 'phone']
                }
            ],
            transaction: t
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if vendor owns this restaurant
        if (order.restaurant.vendor_id !== vendorId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const oldStatus = order.status;

        // Update order status
        await order.update({
            status,
            estimated_delivery_time: estimated_delivery_time || order.estimated_delivery_time,
            delivered_at: status === 'delivered' ? new Date() : null
        }, { transaction: t });

        await t.commit();

        // Get complete updated order with all details
        const updatedOrder = await Order.findByPk(id, {
            include: [
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: MenuItem,
                            as: 'menu_item',
                            attributes: ['id', 'name', 'image_url', 'price', 'discount_price']
                        }
                    ]
                },
                {
                    model: Restaurant,
                    as: 'restaurant',
                    attributes: ['id', 'name', 'address', 'phone', 'image_url']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email', 'phone', 'address']
                }
            ]
        });
        notifyOrderStatusUpdate(updatedOrder, oldStatus, status);
        // Gửi email thông báo cập nhật trạng thái (không await để không block response)
        sendOrderStatusUpdate(updatedOrder, updatedOrder.user, updatedOrder.restaurant, oldStatus, status)
            .catch(err => console.error('❌ Status update email failed:', err.message));

        res.json({
            success: true,
            message: `Order status updated from ${oldStatus} to ${status}`,
            order: updatedOrder
        });

    } catch (error) {
        await t.rollback();
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Track order (real-time)
// @route   GET /api/orders/:id/track
// @access  Private (User only)
const trackOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const order = await Order.findByPk(id, {
            include: [
                {
                    model: Restaurant,
                    as: 'restaurant',
                    attributes: ['id', 'name', 'address', 'phone']
                },
                {
                    model: OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: MenuItem,
                            as: 'menu_item',
                            attributes: ['id', 'name', 'image_url']
                        }
                    ]
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        res.json({
            success: true,
            order: {
                id: order.id,
                order_number: order.order_number,
                status: order.status,
                total_amount: order.total_amount,
                delivery_address: order.delivery_address,
                delivery_fee: order.delivery_fee,
                estimated_delivery_time: order.estimated_delivery_time,
                created_at: order.created_at,
                delivered_at: order.delivered_at,
                restaurant: order.restaurant,
                items: order.items
            }
        });

    } catch (error) {
        console.error('Track order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Cancel order (User)
// @route   PUT /api/orders/:id/cancel
// @access  Private (User only)
const cancelOrder = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const { id } = req.params;
        const userId = req.user.id;

        const order = await Order.findByPk(id, { transaction: t });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Only allow cancellation if order is pending or confirmed
        if (!['pending', 'confirmed'].includes(order.status)) {
            return res.status(400).json({
                message: 'Order cannot be cancelled at this stage'
            });
        }

        await order.update({ status: 'cancelled' }, { transaction: t });

        await t.commit();

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            order
        });

    } catch (error) {
        await t.rollback();
        console.error('Cancel order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    getVendorOrders,
    updateOrderStatus,
    trackOrder,
    cancelOrder
};