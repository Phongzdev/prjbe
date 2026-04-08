const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    restaurant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    order_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'),
        defaultValue: 'pending'
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    delivery_address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    delivery_fee: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    payment_method: {
        type: DataTypes.ENUM('cash', 'stripe', 'momo'),
        allowNull: false
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed'),
        defaultValue: 'pending'
    },
    stripe_payment_intent_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estimated_delivery_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    delivered_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'orders',
    timestamps: true,
    underscored: true
});

Order.associate = (models) => {
    Order.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
    Order.belongsTo(models.Restaurant, {
        foreignKey: 'restaurant_id',
        as: 'restaurant'
    });
    Order.hasMany(models.OrderItem, {
        foreignKey: 'order_id',
        as: 'items'
    });
    Order.hasOne(models.Notification, {
        foreignKey: 'order_id',
        as: 'notification'
    });
};

module.exports = Order;