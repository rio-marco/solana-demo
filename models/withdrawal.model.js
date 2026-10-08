'use strict';

const mongoose = require('mongoose');

const WithdrawalSchema = new mongoose.Schema(
    {
        withdrawId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        toAddress: {
            type: String,
            required: true,
            trim: true,
        },
        memo: {
            type: String,
            required: false,
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
        fromAddress: {
            type: String,
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
        confirmedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);

WithdrawalSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);