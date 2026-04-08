const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
    createMomoPayment,
    momoCallback,
    checkPaymentStatus
} = require('../controllers/paymentController');

// MoMo callback (public)
router.post('/momo-callback', momoCallback);

// Protected routes
router.use(authenticateToken);
router.post('/momo', createMomoPayment);
router.get('/status/:orderId', checkPaymentStatus);

module.exports = router;