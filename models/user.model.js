'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const constants = require('../config/constant');

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        memo: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        walletBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        verificationOtp: {
            type: String,
            default: null,
        },
        verificationOtpExpires: {
            type: Date,
            default: null,
        },
        verificationToken: {
            type: String,
            default: null,
            index: true,
        },
        status: {
            type: Number,
            enum: Object.values(constants.USER_STATUS),
            default: constants.USER_STATUS.InACTIVE,
        },
    },
    {
        timestamps: true,
    },
);

UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    };
});

module.exports = mongoose.model('User', UserSchema);