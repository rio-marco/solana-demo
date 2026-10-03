'use strict';

const mongoose = require('mongoose');
const constants = require('../config/constant');

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: false,
        },
        authToken: {
            type: String,
            required: true,
        },
        ip: {
            type: String,
            required: true,
        },
        ua: {
            type: String,
            required: true,
        },
        status: {
            type: Number,
            enum: Object.values(constants.SESSION_STATUS),
            default: constants.SESSION_STATUS.ACTIVE,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

module.exports = mongoose.model('Sessions', sessionSchema);