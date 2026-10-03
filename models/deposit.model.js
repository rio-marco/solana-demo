'use strict';

const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true,
        },
        depositId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        memo: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0.000000001,
        },
        currency: {
            type: String,
            default: 'SOL',
        },
        platformAddress: {
            type: String,
            required: true,
            trim: true,
        },
        transactionSignature: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED'],
            default: 'PENDING',
            index: true,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        submittedAt: {
            type: Date,
        },
        confirmedAt: {
            type: Date,
        },
        failureReason: {
            type: String,
            default: null,
        },
        slot: {
            type: Number,
            default: null,
        },
        blockTime: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

DepositSchema.index({
    status: 1,
    createdAt: -1,
});

module.exports = mongoose.model('Deposit', DepositSchema);