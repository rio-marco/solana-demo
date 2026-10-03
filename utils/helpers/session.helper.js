const mongoose = require('mongoose');
const Generallib = require('../lib/general.lib');
const Session = require('../../models/session.model');

const { ObjectId } = mongoose.Types;

const sessionHelper = {
    generateAndStoreSession: async (req, ip, userId, retryCount = 0) => {
        const MAX_RETRIES = 3;

        try {
            const authToken = await Generallib.generateAuthToken({ _id: userId.toString() });
            if (!authToken) {
                if (retryCount < MAX_RETRIES) {
                    return sessionHelper.generateAndStoreSession(
                        req,
                        ip,
                        userId,
                        retryCount + 1
                    );
                };

                Generallib.log1(["Failed to generate auth token after retries", { userId, retryCount }]);

                return null;
            };

            const ua = req.headers["user-agent"] || "";

            const createSessionPayload = {
                userId: new ObjectId(userId),
                authToken,
                ip,
                ua,
            };

            const sessionDetails = await Session.create(createSessionPayload);
            if (!sessionDetails) {
                if (retryCount < MAX_RETRIES) {
                    return sessionHelper.generateAndStoreSession(
                        req,
                        ip,
                        userId,
                        retryCount + 1
                    );
                };

                Generallib.log1(["Failed to create session after retries", { userId, retryCount }]);

                return null;
            };

            return sessionDetails;
        } catch (error) {
            Generallib.log1(["Error in generateAndStoreSession ----->", error]);
            return null;
        };
    },
};

module.exports = sessionHelper;