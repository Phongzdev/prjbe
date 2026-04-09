const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../models');
const User = db.User;
const sendEmail = require('../utils/emailService');

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
    );
};

// Register
const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password, full_name, phone, role, address } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const user = await User.create({
            email,
            password_hash: password,
            full_name,
            phone,
            role: role || 'user',
            address
        });

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login
const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.is_active === false) {
            return res.status(403).json({ message: 'Your account has been locked. Please contact support.' });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get current user
const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Forgot Password
const forgotPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findOne({ where: { email: req.body.email } });

        if (!user) {
            return res.status(404).json({ message: 'There is no user with that email' });
        }

        // Generate token using user password hash as secret (stateless token strategy)
        // If password is changed, the token automatically becomes invalid
        const secret = process.env.JWT_SECRET + user.password_hash;
        const resetToken = jwt.sign({ id: user.id, email: user.email }, secret, {
            expiresIn: '15m' // 15 minutes expiration
        });

        // Create reset URL
        // Example: http://localhost:3000/reset-password/abcdefg...
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}?id=${user.id}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT or POST request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password reset token',
                message
            });

            res.status(200).json({ success: true, message: 'Email sent' });
        } catch (err) {
            console.error('Email could not be sent:', err);
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Reset Password
const resetPassword = async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { token } = req.params;
        const { id, password } = req.body;

        // Ensure user exists
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(400).json({ message: 'Invalid token or user does not exist' });
        }

        // Validate token
        const secret = process.env.JWT_SECRET + user.password_hash;
        try {
            jwt.verify(token, secret);
        } catch (err) {
            return res.status(400).json({ message: 'Token is invalid or has expired' });
        }

        // Set new password
        user.password_hash = password;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword
};