const db = require('../models');
const Order = db.Order;
const momoService = require('../services/momoService');

// @desc    Create MoMo payment
// @route   POST /api/payments/momo
// @access  Private
const createMomoPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findByPk(orderId, {
            include: [
                { model: db.User, as: 'user' },
                { model: db.Restaurant, as: 'restaurant' }
            ]
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if order belongs to user
        if (order.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // Create MoMo payment
        const momoResponse = await momoService.createPayment(order);

        if (momoResponse.resultCode === 0) {
            res.json({
                success: true,
                payUrl: momoResponse.payUrl,
                requestId: momoResponse.requestId
            });
        } else {
            res.status(400).json({
                success: false,
                message: momoResponse.message || 'Failed to create payment'
            });
        }

    } catch (error) {
        console.error('Create MoMo payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    MoMo callback (IPN)
// @route   POST /api/payments/momo-callback
// @access  Public
const momoCallback = async (req, res) => {
    console.log('MoMo callback received:', req.body);

    try {
        const verification = momoService.verifyCallback(req.body);

        if (!verification.verified) {
            console.error('Invalid MoMo signature');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const order = await Order.findOne({
            where: { order_number: verification.orderId }
        });

        if (!order) {
            console.error('Order not found:', verification.orderId);
            return res.status(404).json({ message: 'Order not found' });
        }

        if (verification.resultCode === 0) {
            await order.update({
                payment_status: 'paid',
                status: 'confirmed'
            });
            console.log(`✅ Payment successful for order ${order.order_number}`);
        } else {
            await order.update({
                payment_status: 'failed'
            });
            console.log(`❌ Payment failed for order ${order.order_number}: ${verification.message}`);
        }

        res.status(200).json({ message: 'Received' });

    } catch (error) {
        console.error('MoMo callback error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Check payment status
// @route   GET /api/payments/status/:orderId
// @access  Private
const checkPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findByPk(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        res.json({
            success: true,
            payment_status: order.payment_status,
            order_status: order.status
        });

    } catch (error) {
        console.error('Check payment status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createMomoPayment,
    momoCallback,
    checkPaymentStatus
};