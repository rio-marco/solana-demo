'use strict';

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['DEPOSIT', 'WITHDRAWAL', 'SYSTEM'],
            default: 'SYSTEM',
        },
        amount: {
            type: Number,
            default: 0,
        },
        transactionSignature: {
            type: String,
            default: null,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
