'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/login', authController.getLoginPage);
router.post('/api/auth/login', authController.login);

router.get('/signup', authController.getSignupPage);
router.post('/api/auth/signup', authController.signup);

router.get('/verify-otp', authController.getVerifyOtpPage);
router.post('/api/auth/verify-otp', authController.verifyOtp);

router.get('/auth/direct-login', authController.directLoginLink);
router.get('/logout', authMiddleware, authController.logout);

module.exports = router;
