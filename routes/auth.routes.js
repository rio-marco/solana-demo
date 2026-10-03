'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.get('/login', authController.renderLogin);
router.post('/api/auth/login', authController.login);

router.get('/signup', authController.renderSignup);
router.post('/api/auth/signup', authController.signup);

router.get('/verify-otp', authController.renderVerifyOtp);
router.post('/api/auth/verify-otp', authController.verifyOtp);

router.get('/auth/direct-login', authController.directLoginLink);
router.get('/logout', authController.logout);

module.exports = router;
