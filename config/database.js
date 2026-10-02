'use strict';

const mongoose = require('mongoose');

const connectDatabase = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;

        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log("Database Connected Successfully");
    } catch (error) {
        console.error(`[MongoDB Error] Failed to connect: ${error.message}`);
        console.warn(`[MongoDB Warning] Please ensure MongoDB is running locally or MONGODB_URI is correctly set in .env`);
    };
};

module.exports = connectDatabase;
