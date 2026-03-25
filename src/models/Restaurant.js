const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Restaurant = sequelize.define('Restaurant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    image_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    opening_time: {
        type: DataTypes.TIME,
        allowNull: true
    },
    closing_time: {
        type: DataTypes.TIME,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0
    },
    total_ratings: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'restaurants',
    timestamps: true,
    underscored: true
});

Restaurant.associate = (models) => {
    Restaurant.belongsTo(models.User, {
        foreignKey: 'vendor_id',
        as: 'vendor'
    });
    Restaurant.hasMany(models.MenuItem, {
        foreignKey: 'restaurant_id',
        as: 'menu_items'
    });
    Restaurant.hasMany(models.Category, {
        foreignKey: 'restaurant_id',
        as: 'categories'
    });
    Restaurant.hasMany(models.Order, {
        foreignKey: 'restaurant_id',
        as: 'orders'
    });
    Restaurant.hasMany(models.Review, {
        foreignKey: 'restaurant_id',
        as: 'reviews'
    });
};

module.exports = Restaurant;