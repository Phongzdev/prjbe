const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserVoucher = sequelize.define('UserVoucher', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    voucher_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    used_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'user_vouchers',
    timestamps: true,
    underscored: true
});

module.exports = UserVoucher;