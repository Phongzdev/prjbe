const db = require('../models');
const Voucher = db.Voucher;
const UserVoucher = db.UserVoucher;
const { Op } = require('sequelize');

// @desc    Get available vouchers
// @route   GET /api/vouchers/available
// @access  Private
const getAvailableVouchers = async (req, res) => {
    try {
        const now = new Date();

        const vouchers = await Voucher.findAll({
            where: {
                is_active: true,
                start_date: { [Op.lte]: now },
                end_date: { [Op.gte]: now },
                [Op.or]: [
                    { usage_limit: 0 },
                    { used_count: { [Op.lt]: db.sequelize.col('usage_limit') } }
                ]
            },
            order: [['created_at', 'DESC']]
        });

        // Get user's used vouchers
        const userVouchers = await UserVoucher.findAll({
            where: { user_id: req.user.id, is_used: true },
            attributes: ['voucher_id']
        });

        const usedVoucherIds = userVouchers.map(uv => uv.voucher_id);

        const availableVouchers = vouchers.filter(v => !usedVoucherIds.includes(v.id));

        res.json({
            success: true,
            vouchers: availableVouchers
        });

    } catch (error) {
        console.error('Get available vouchers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Apply voucher
// @route   POST /api/vouchers/apply
// @access  Private
const applyVoucher = async (req, res) => {
    try {
        const { code, subtotal } = req.body;

        const voucher = await Voucher.findOne({
            where: { code: code.toUpperCase(), is_active: true }
        });

        if (!voucher) {
            return res.status(404).json({ message: 'Invalid voucher code' });
        }

        // Check date
        const now = new Date();
        if (now < voucher.start_date || now > voucher.end_date) {
            return res.status(400).json({ message: 'Voucher has expired' });
        }

        // Check usage limit
        if (voucher.usage_limit > 0 && voucher.used_count >= voucher.usage_limit) {
            return res.status(400).json({ message: 'Voucher has reached usage limit' });
        }

        // Check min order amount
        if (subtotal < voucher.min_order_amount) {
            return res.status(400).json({
                message: `Minimum order amount is ${voucher.min_order_amount.toLocaleString()}đ`
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (voucher.discount_type === 'percentage') {
            discountAmount = subtotal * (voucher.discount_value / 100);
            if (voucher.max_discount && discountAmount > voucher.max_discount) {
                discountAmount = voucher.max_discount;
            }
        } else {
            discountAmount = voucher.discount_value;
            if (discountAmount > subtotal) {
                discountAmount = subtotal;
            }
        }

        res.json({
            success: true,
            voucher: {
                id: voucher.id,
                code: voucher.code,
                name: voucher.name,
                discount_type: voucher.discount_type,
                discount_value: voucher.discount_value,
                discount_amount: Math.round(discountAmount)
            }
        });

    } catch (error) {
        console.error('Apply voucher error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Admin: Create voucher
// @route   POST /api/vouchers
// @access  Private (Admin only)
const createVoucher = async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            discount_type,
            discount_value,
            min_order_amount,
            max_discount,
            start_date,
            end_date,
            usage_limit
        } = req.body;

        const voucher = await Voucher.create({
            code: code.toUpperCase(),
            name,
            description,
            discount_type,
            discount_value,
            min_order_amount: min_order_amount || 0,
            max_discount,
            start_date,
            end_date,
            usage_limit: usage_limit || 0
        });

        res.status(201).json({
            success: true,
            message: 'Voucher created successfully',
            voucher
        });

    } catch (error) {
        console.error('Create voucher error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getAvailableVouchers,
    applyVoucher,
    createVoucher
};