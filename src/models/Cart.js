const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cart = sequelize.define('Cart', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    restaurant_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'carts',
    timestamps: true,
    underscored: true
});

Cart.associate = (models) => {
    Cart.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
    Cart.belongsTo(models.Restaurant, {
        foreignKey: 'restaurant_id',
        as: 'restaurant'
    });
    Cart.hasMany(models.CartItem, {
        foreignKey: 'cart_id',
        as: 'items'
    });
};

module.exports = Cart;