const db = require('../models');
const Cart = db.Cart;
const CartItem = db.CartItem;
const MenuItem = db.MenuItem;
const Restaurant = db.Restaurant;

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private (User only)
const getCart = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find or create cart for user
        let cart = await Cart.findOne({
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
                                    as: 'restaurant',
                                    attributes: ['id', 'name', 'image_url']
                                }
                            ]
                        }
                    ]
                },
                {
                    model: Restaurant,
                    as: 'restaurant',
                    attributes: ['id', 'name', 'image_url', 'address']
                }
            ]
        });

        if (!cart) {
            return res.json({
                success: true,
                cart: null,
                items: [],
                total_items: 0,
                total_price: 0
            });
        }

        // Calculate totals
        let totalItems = 0;
        let totalPrice = 0;

        if (cart.items && cart.items.length > 0) {
            cart.items.forEach(item => {
                totalItems += item.quantity;
                const price = item.menu_item.discount_price || item.menu_item.price;
                totalPrice += price * item.quantity;
            });
        }

        res.json({
            success: true,
            cart: {
                id: cart.id,
                restaurant_id: cart.restaurant_id,
                restaurant: cart.restaurant
            },
            items: cart.items,
            total_items: totalItems,
            total_price: totalPrice
        });

    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private (User only)
const addToCart = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const userId = req.user.id;
        const { menu_item_id, quantity, special_instructions } = req.body;

        if (!menu_item_id) {
            return res.status(400).json({ message: 'Menu item ID is required' });
        }

        const qty = quantity || 1;
        if (qty < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        // Get menu item details
        const menuItem = await MenuItem.findByPk(menu_item_id, {
            include: [{ model: Restaurant, as: 'restaurant' }]
        });

        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        if (!menuItem.is_available) {
            return res.status(400).json({ message: 'This item is currently unavailable' });
        }

        const restaurantId = menuItem.restaurant_id;
        const unitPrice = menuItem.discount_price || menuItem.price;

        // Find user's cart
        let cart = await Cart.findOne({
            where: { user_id: userId },
            transaction: t
        });

        // If cart doesn't exist, create new cart
        if (!cart) {
            cart = await Cart.create({
                user_id: userId,
                restaurant_id: restaurantId
            }, { transaction: t });
        }

        // If cart has items from different restaurant, clear it first
        if (cart.restaurant_id && cart.restaurant_id !== restaurantId) {
            await CartItem.destroy({
                where: { cart_id: cart.id },
                transaction: t
            });
            await cart.update({ restaurant_id: restaurantId }, { transaction: t });
        } else if (!cart.restaurant_id) {
            await cart.update({ restaurant_id: restaurantId }, { transaction: t });
        }

        // Check if item already exists in cart
        let cartItem = await CartItem.findOne({
            where: {
                cart_id: cart.id,
                menu_item_id: menu_item_id
            },
            transaction: t
        });

        if (cartItem) {
            // Update quantity
            await cartItem.update({
                quantity: cartItem.quantity + qty,
                special_instructions: special_instructions || cartItem.special_instructions
            }, { transaction: t });
        } else {
            // Add new item
            cartItem = await CartItem.create({
                cart_id: cart.id,
                menu_item_id: menu_item_id,
                quantity: qty,
                unit_price: unitPrice,
                special_instructions: special_instructions
            }, { transaction: t });
        }

        await t.commit();

        // Get updated cart
        const updatedCart = await Cart.findOne({
            where: { id: cart.id },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [{ model: MenuItem, as: 'menu_item' }]
                }
            ]
        });

        res.json({
            success: true,
            message: 'Item added to cart successfully',
            cartItem,
            cart: {
                id: updatedCart.id,
                items_count: updatedCart.items.length,
                total_items: updatedCart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Add to cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private (User only)
const updateCartItem = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        const { quantity, special_instructions } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be at least 1' });
        }

        // Find cart item
        const cartItem = await CartItem.findByPk(itemId, {
            include: [
                {
                    model: Cart,
                    as: 'cart',
                    where: { user_id: userId }
                },
                {
                    model: MenuItem,
                    as: 'menu_item'
                }
            ],
            transaction: t
        });

        if (!cartItem) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        // Update quantity
        await cartItem.update({
            quantity: quantity,
            special_instructions: special_instructions !== undefined
                ? special_instructions
                : cartItem.special_instructions
        }, { transaction: t });

        await t.commit();

        res.json({
            success: true,
            message: 'Cart item updated successfully',
            cartItem
        });

    } catch (error) {
        await t.rollback();
        console.error('Update cart item error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private (User only)
const removeFromCart = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const userId = req.user.id;
        const { itemId } = req.params;

        // Find cart item
        const cartItem = await CartItem.findByPk(itemId, {
            include: [
                {
                    model: Cart,
                    as: 'cart',
                    where: { user_id: userId }
                }
            ],
            transaction: t
        });

        if (!cartItem) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        await cartItem.destroy({ transaction: t });

        // Check if cart is empty
        const remainingItems = await CartItem.count({
            where: { cart_id: cartItem.cart_id },
            transaction: t
        });

        if (remainingItems === 0) {
            // Clear restaurant_id from cart
            await Cart.update(
                { restaurant_id: null },
                { where: { id: cartItem.cart_id }, transaction: t }
            );
        }

        await t.commit();

        res.json({
            success: true,
            message: 'Item removed from cart successfully'
        });

    } catch (error) {
        await t.rollback();
        console.error('Remove from cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private (User only)
const clearCart = async (req, res) => {
    const t = await db.sequelize.transaction();

    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({
            where: { user_id: userId },
            transaction: t
        });

        if (cart) {
            await CartItem.destroy({
                where: { cart_id: cart.id },
                transaction: t
            });

            await cart.update({ restaurant_id: null }, { transaction: t });
        }

        await t.commit();

        res.json({
            success: true,
            message: 'Cart cleared successfully'
        });

    } catch (error) {
        await t.rollback();
        console.error('Clear cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
};