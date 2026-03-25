const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const db = {};

// Đọc tất cả file trong thư mục models (trừ index.js)
const files = fs.readdirSync(__dirname).filter(file => {
    return (file.indexOf('.') !== 0) &&
        (file !== 'index.js') &&
        (file.slice(-3) === '.js');
});

// Load từng model
for (const file of files) {
    const model = require(path.join(__dirname, file));
    const modelName = path.basename(file, '.js');
    db[modelName] = model;
}

// Chạy hàm associate của từng model (nếu có)
Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;