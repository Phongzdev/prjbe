const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MenuItem = sequelize.define('MenuItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    restaurant_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    discount_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    image_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_popular: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    preparation_time: {
        type: DataTypes.INTEGER,
        defaultValue: 15
    }
}, {
    tableName: 'menu_items',
    timestamps: true,
    underscored: true
});

MenuItem.associate = (models) => {
    MenuItem.belongsTo(models.Restaurant, {
        foreignKey: 'restaurant_id',
        as: 'restaurant'
    });
    MenuItem.belongsTo(models.Category, {
        foreignKey: 'category_id',
        as: 'category'
    });
    MenuItem.hasMany(models.OrderItem, {
        foreignKey: 'menu_item_id',
        as: 'order_items'
    });
    MenuItem.hasMany(models.CartItem, {
        foreignKey: 'menu_item_id',
        as: 'cart_items'
    });
};

module.exports = MenuItem;