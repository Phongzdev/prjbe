const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { updateProfile, getProfile } = require('../controllers/userController');

// All routes require authentication and user role
router.use(authenticateToken);
router.use(authorizeRoles('user'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;