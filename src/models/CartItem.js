const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CartItem = sequelize.define('CartItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cart_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    menu_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    special_instructions: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'cart_items',
    timestamps: true,
    underscored: true
});

CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, {
        foreignKey: 'cart_id',
        as: 'cart'
    });
    CartItem.belongsTo(models.MenuItem, {
        foreignKey: 'menu_item_id',
        as: 'menu_item'
    });
};

module.exports = CartItem;