'use strict';

const path = require('path');
const ejs = require('ejs');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError } = require('../utils/response');
const { sendMail } = require('../services/mail.service');
const constants = require('../config/constant');
const Generallib = require('../utils/lib/general.lib');
const messages = require('../utils/messages');
const sessionHelper = require('../utils/helpers/session.helper');
const User = require('../models/user.model');
const Session = require('../models/session.model');

const getLoginPage = (req, res) => {
    try {
        if (req.session && req.session.user && req.session.user._id) {
            return res.redirect('/');
        };

        return res.render("login", {
            header: {},
            body: {},
            footer: {
                js: ["login.js"],
            },
        });
    } catch (error) {
        Generallib.log1(["Error in getLoginPage----->", error]);
        return res.json(Generallib.error_res(messages.unexpectedDataError));
    };
};

const getSignupPage = (req, res) => {
    try {
        if (req.session && req.session.user && req.session.user._id) {
            return res.redirect('/');
        };

        return res.render("signup", {
            header: {},
            body: {},
            footer: {
                js: ["signup.js"],
            },
        });
    } catch (error) {
        Generallib.log1(["Error in getSignupPage----->", error]);
        return res.json(Generallib.error_res(messages.unexpectedDataError));
    };
};

const getVerifyOtpPage = (req, res) => {
    try {
        if (req.session && req.session.user && req.session.user._id) {
            return res.redirect('/');
        };

        const email = req.query.email;

        if (!email || typeof email !== 'string' || !email.trim()) {
            return res.redirect('/login');
        };

        return res.render("verify-otp", {
            header: {},
            body: {
                email,
            },
            footer: {
                js: ["verify-otp.js"],
            },
        });
    } catch (error) {
        Generallib.log1(["Error in getVerifyOtpPage----->", error]);
        return res.json(Generallib.error_res(messages.unexpectedDataError));
    };
};

const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.json(Generallib.error_res("Name is required."));
        };

        if (!email || typeof email !== 'string' || !email.trim()) {
            return res.json(Generallib.error_res("Email is required."));
        };

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.json(Generallib.error_res("Please provide a valid email address."));
        };

        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.json(Generallib.error_res("Password must be at least 6 characters long."));
        };

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.json(Generallib.error_res("An account with this email address already exists."));
        };

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

        const baseUrl = process.env.NODE_URL;
        const directLoginUrl = `${baseUrl}/auth/direct-login?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

        const mailFile = await ejs.renderFile("views/emails/otp-verification.ejs", {
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
            return res.json(Generallib.error_res("Failed to send OTP."));
        };

        return res.json(Generallib.success_res("Registration successful! Verification email sent.", {
            email: user.email,
            redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}`,
        }));
    } catch (err) {
        Generallib.log1(["Error in signup----->", err]);
        return res.json(Generallib.error_res("Registration failed. Please try again."));
    };
};

const verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.json(Generallib.error_res("Email and 6-digit OTP code are required."));
        };

        const cleanEmail = email.trim().toLowerCase();
        const cleanOtp = otp.toString().trim();

        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.json(Generallib.error_res("User not found."));
        };

        if (user.verificationOtp !== cleanOtp) {
            return res.json(Generallib.error_res("Invalid OTP code."));
        };

        if (user.verificationOtpExpires && user.verificationOtpExpires < new Date()) {
            return res.json(Generallib.error_res("OTP code has expired. Please request a new one."));
        };

        user.isVerified = true;
        user.verificationOtp = null;
        user.verificationOtpExpires = null;
        user.verificationToken = null;
        user.status = constants.USER_STATUS.ACTIVE;

        await user.save();

        const ip = await Generallib.getIp(req);

        const sessionDetails = await sessionHelper.generateAndStoreSession(req, ip, user._id);

        if (!sessionDetails) {
            return res.status(constants.STATUS.INTERNAL_SERVER_ERROR).json(Generallib.error_res(messages.unexpectedDataError));
        };

        req.session.user = { _id: user._id.toString(), authToken: sessionDetails?.authToken };

        return res.json(Generallib.success_res("Email verified successfully! Redirecting to dashboard..."));
    } catch (err) {
        Generallib.log1(["Error in verifyOtp----->", err]);
        return res.json(Generallib.error_res("OTP verification failed. Please try again."));
    }
};

const directLoginLink = async (req, res, next) => {
    try {
        const { token, email } = req.query;

        if (!token || !email) {
            return res.redirect('/login');
        };

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.redirect('/login');
        };

        if (user.verificationToken && user.verificationToken === token) {
            user.isVerified = true;
            user.verificationOtp = null;
            user.verificationOtpExpires = null;
            user.verificationToken = null;
            user.status = constants.USER_STATUS.ACTIVE;
            await user.save();
        } else if (!user.isVerified) {
            return res.redirect('/login');
        };

        const ip = await Generallib.getIp(req);

        const sessionDetails = await sessionHelper.generateAndStoreSession(req, ip, user._id);

        if (!sessionDetails) {
            return res.status(constants.STATUS.INTERNAL_SERVER_ERROR).json(Generallib.error_res(messages.unexpectedDataError));
        };

        req.session.user = { _id: user._id.toString(), authToken: sessionDetails?.authToken };

        return res.redirect('/');
    } catch (err) {
        Generallib.log1(["Error in directLoginLink----->", err]);
        return res.redirect('/login');
    };
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json(Generallib.error_res("Email and password are required."));
        };

        const cleanEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
            return res.json(Generallib.error_res("Invalid email or password."));
        } else if (user.status === constants.USER_STATUS.SUSPENDED) {
            return res.status(constants.STATUS.BAD_REQUEST).json(Generallib.error_res("Your account has been suspended. Please contact support."));
        };

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(constants.STATUS.BAD_REQUEST).json(Generallib.error_res("Invalid credentials."));
        };

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

                const mailFile = await ejs.renderFile("views/emails/otp-verification.ejs", {
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
                    return res.json(Generallib.error_res("Failed to send OTP"));
                };
            } catch (mailErr) {
                console.error('[Login Re-send OTP Warning]:', mailErr.message);
                return res.json(Generallib.error_res("Failed to send OTP"));
            };

            return res.json(Generallib.error_res("Please verify your email address first. A new OTP verification code has been sent to your email.", {
                unverified: true,
                redirectUrl: `/verify-otp?email=${encodeURIComponent(user.email)}`,
            }));
        };

        const ip = await Generallib.getIp(req);

        const sessionDetails = await sessionHelper.generateAndStoreSession(req, ip, user._id);

        if (!sessionDetails) {
            return res.status(constants.STATUS.INTERNAL_SERVER_ERROR).json(Generallib.error_res(messages.unexpectedDataError));
        };

        req.session.user = { _id: user._id.toString(), authToken: sessionDetails?.authToken };

        return res.status(constants.STATUS.OK).json(Generallib.success_res("Login successful! Redirecting to dashboard...", { redirectUrl: "/" }));
    } catch (err) {
        Generallib.log1(["Error in Login----->", err]);
        return res.status(constants.STATUS.BAD_REQUEST).json(Generallib.error_res("Login failed. Please try again."));
    };
};

module.exports = {
    getLoginPage,
    getSignupPage,
    getVerifyOtpPage,
    signup,
    verifyOtp,
    directLoginLink,
    login,
};
