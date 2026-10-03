'use strict';

const User = require('../models/user.model');
const { sendError } = require('../utils/response');

const isAuthenticatedPage = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.redirect('/login');
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy(() => {});
            return res.redirect('/login');
        }

        req.user = user;
        res.locals.user = user;
        next();
    } catch (err) {
        console.error('[Auth Middleware Page Error]:', err.message);
        res.redirect('/login');
    }
};

const isAuthenticatedApi = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return sendError(res, 'Unauthorized access. Please log in first.', 401);
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy(() => {});
            return sendError(res, 'User session invalid or expired.', 401);
        }

        req.user = user;
        res.locals.user = user;
        next();
    } catch (err) {
        console.error('[Auth Middleware API Error]:', err.message);
        return sendError(res, 'Internal server authentication error', 500);
    }
};

module.exports = {
    isAuthenticatedPage,
    isAuthenticatedApi,
};
