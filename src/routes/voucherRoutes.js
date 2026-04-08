const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    getAvailableVouchers,
    applyVoucher,
    createVoucher
} = require('../controllers/voucherController');

// User routes
router.get('/available', authenticateToken, authorizeRoles('user'), getAvailableVouchers);
router.post('/apply', authenticateToken, authorizeRoles('user'), applyVoucher);

// Admin routes
router.post('/', authenticateToken, authorizeRoles('admin'), createVoucher);

module.exports = router;