'use strict';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const generalLib = require('../utils/lib/general.lib');
const constants = require('../config/constant');
const messages = require('../utils/messages');
const User = require('../models/user.model');
const Session = require('../models/session.model');

const { ObjectId } = mongoose.Types;

const authMiddleware = async (req, res, next) => {
    try {
        const authToken = req.session?.user?.authToken;
        if (!authToken) {
            return handleUnauth(req, res);
        };

        const decodedToken = await jwt.verify(authToken, process.env.AUTH_SECRET);
        if (!decodedToken) {
            return handleUnauth(req, res);
        };

        const userId = decodedToken?._id;
        if (!userId) {
            return handleUnauth(req, res);
        };

        const ua = req.headers["user-agent"];

        const userSession = await Session.findOne({ userId: new ObjectId(userId), authToken, ua, status: constants.SESSION_STATUS.ACTIVE }).lean();
        if (!userSession) {
            return handleUnauth(req, res);
        };

        const user = await User.findOne({ _id: new ObjectId(userId), status: constants.USER_STATUS.ACTIVE }).lean();
        if (!user) {
            return handleUnauth(req, res);
        };

        req.user = user;
        req.userId = userId;

        next();

    } catch (error) {
        generalLib.log1(["Error in authMiddleware ----->", error]);
        return handleUnauth(req, res);
    };
};

const handleUnauth = async (req, res, message = messages.unauthorizedAccess) => {
    const method = req.method;

    req.session.destroy();

    if (method === "GET") {
        return res.redirect("/login");
    } else {
        return res.status(constants.STATUS.UNAUTHORIZED).json(generalLib.error_res(message));
    };
};

module.exports = authMiddleware;