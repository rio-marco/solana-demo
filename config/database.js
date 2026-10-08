'use strict';

const mongoose = require('mongoose');
const { log1 } = require('../utils/general');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDatabase = async () => {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        log1('[MongoDB Warning] MONGODB_URI environment variable is not defined.');
        return null;
    }

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
        };

        cached.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
            log1('[MongoDB] Connected Successfully');
            return mongooseInstance;
        }).catch((err) => {
            log1(`[MongoDB Error] Failed to connect: ${err.message}`);
            cached.promise = null;
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
};

module.exports = connectDatabase;
