'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user.model');
const { sendSuccess, sendError } = require('../utils/response');
const { sendVerificationEmail } = require('../services/mail.service');
const constants = require('../config/constant');

const __dirname = path.resolve();

const renderLogin = (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    return res.render('login', { error: null });
};

const renderSignup = (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    return res.render('signup', { error: null });
};

const renderVerifyOtp = (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    const email = req.query.email || (req.session && req.session.pendingEmail) || '';
    return res.render('verify-otp', { email, error: null });
};

const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return sendError(res, 'Name is required.', 400);
        }

        if (!email || typeof email !== 'string' || !email.trim()) {
            return sendError(res, 'Email is required.', 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return sendError(res, 'Please provide a valid email address.', 400);
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            return sendError(res, 'Password must be at least 6 characters long.', 400);
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return sendError(res, 'An account with this email address already exists.', 400);
        }

        const uniqueMemo = await Generallib.generateUniqueMemo();
        const otpCode = Generallib.generateOtp(constants.OTP_LENGTH);
        const verificationToken = uuidv4();
        const otpExpires = new Date(Date.now() + constants.OTP_EXPIRY_MINUTE); // 10 minutes

        const user = new User({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            memo: uniqueMemo,
            walletBalance: 0,
            isVerified: false,
            verificationOtp: otpCode,
            verificationOtpExpires: otpExpires,
            verificationToken: verificationToken,
        });

        await user.save();

        if (req.session) {
            req.session.pendingEmail = user.email;
        };

        try {
            const baseUrl = process.env.NODE_URL;
            const directLoginUrl = `${baseUrl}/auth/direct-login?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

            const mailFile = await ejs.renderFile(path.join(__dirname, "views/emails/otp-verification.ejs"), {
                title: "New Register OTP",
                userName: user.name,
                otpCode: otpCode,
                directLoginUrl: directLoginUrl,
                expireIn: constants.OTP_EXPIRY_MINUTE / (1000 * 60), // Convert milliseconds to minutes
            });

            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME,
                to: user.email,
                subject: `${otpCode} is your Solana System verification code`,
                html: mailFile,
            };

            const emailSent = await sendMail(mailOptions);
            if (!emailSent) {
                return sendError(res, "Failed to send OTP", 500);
            };
        } catch (mailErr) {
            console.error('[Signup Email Dispatch Warning]:', mailErr.message);
            return sendError(res, "Failed to send OTP", 500);
        };

        return sendSuccess(res, {
            email: user.email,
            memo: user.memo,
            message: 'Registration successful! Verification email sent.',
            redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}`,
        }, 201);
    } catch (err) {
        console.error('[Signup Error]:', err.message);
        return sendError(res, 'Registration failed. Please try again.', 500);
    }
};

const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return sendError(res, 'Email and 6-digit OTP code are required.', 400);
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanOtp = otp.toString().trim();

        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return sendError(res, 'User not found.', 404);
        }

        if (user.verificationOtp !== cleanOtp) {
            return sendError(res, 'Invalid verification OTP code.', 400);
        }

        if (user.verificationOtpExpires && user.verificationOtpExpires < new Date()) {
            return sendError(res, 'Verification OTP code has expired. Please request a new one.', 400);
        }

        user.isVerified = true;
        user.verificationOtp = null;
        user.verificationOtpExpires = null;
        user.verificationToken = null;
        await user.save();

        if (req.session) {
            req.session.userId = user._id;
            delete req.session.pendingEmail;
        }

        return sendSuccess(res, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                memo: user.memo,
                walletBalance: user.walletBalance,
            },
            message: 'Email verified successfully! Redirecting to dashboard...',
            redirectUrl: '/',
        });
    } catch (err) {
        console.error('[Verify OTP Error]:', err.message);
        return sendError(res, 'OTP verification failed. Please try again.', 500);
    }
};

const directLoginLink = async (req, res, next) => {
    try {
        const { token, email } = req.query;

        if (!token || !email) {
            return res.redirect('/login');
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.redirect('/login');
        }

        if (user.verificationToken && user.verificationToken === token) {
            user.isVerified = true;
            user.verificationOtp = null;
            user.verificationOtpExpires = null;
            user.verificationToken = null;
            await user.save();
        } else if (!user.isVerified) {
            return res.redirect('/login');
        }

        if (req.session) {
            req.session.userId = user._id;
        }

        return res.redirect('/');
    } catch (err) {
        console.error('[Direct Login Link Error]:', err.message);
        return res.redirect('/login');
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendError(res, 'Email and password are required.', 400);
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return sendError(res, 'Invalid email or password.', 400);
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return sendError(res, 'Invalid email or password.', 400);
        }

        if (!user.isVerified) {
            const otpCode = Generallib.generateOtp(constants.OTP_LENGTH);
            const verificationToken = uuidv4();
            user.verificationOtp = otpCode;
            user.verificationOtpExpires = new Date(Date.now() + constants.OTP_EXPIRY_MINUTE); // 10 minutes
            user.verificationToken = verificationToken;

            await user.save();

            try {
                const baseUrl = process.env.NODE_URL;
                const directLoginUrl = `${baseUrl}/auth/direct-login?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

                const mailFile = await ejs.renderFile(path.join(__dirname, "views/emails/otp-verification.ejs"), {
                    title: "New Register OTP",
                    userName: user.name,
                    otpCode: otpCode,
                    directLoginUrl: directLoginUrl,
                    expireIn: constants.OTP_EXPIRY_MINUTE / (1000 * 60), // Convert milliseconds to minutes
                });

                const mailOptions = {
                    from: process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME,
                    to: user.email,
                    subject: `${otpCode} is your Solana System verification code`,
                    html: mailFile,
                };

                const emailSent = await sendMail(mailOptions);
                if (!emailSent) {
                    return sendError(res, "Failed to send OTP", 500);
                };
            } catch (mailErr) {
                console.error('[Login Re-send OTP Warning]:', mailErr.message);
                return sendError(res, "Failed to send OTP", 500);
            };

            return sendError(res, 'Please verify your email address first. A new OTP verification code has been sent to your email.', 403, {
                unverified: true,
                redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}`,
            });
        };

        if (req.session) {
            req.session.userId = user._id;
        }

        return sendSuccess(res, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                memo: user.memo,
                walletBalance: user.walletBalance,
            },
            message: 'Login successful! Redirecting to dashboard...',
            redirectUrl: '/',
        });
    } catch (err) {
        console.error('[Login Error]:', err.message);
        return sendError(res, 'Login failed. Please try again.', 500);
    }
};

const logout = (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) console.error('[Logout Session Destroy Error]:', err.message);
            res.clearCookie('connect.sid');
            return res.redirect('/login');
        });
    } else {
        return res.redirect('/login');
    }
};

module.exports = {
    renderLogin,
    renderSignup,
    renderVerifyOtp,
    signup,
    verifyOtp,
    directLoginLink,
    login,
    logout,
};
