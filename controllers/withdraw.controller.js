'use strict';

const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError } = require('../utils/response');
const { validateMemo, validateAmount } = require('../utils/validation');
const { executeWithdrawalTransaction } = require('../services/solana.service');
const Withdrawal = require('../models/withdrawal.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const { PublicKey } = require('@solana/web3.js');

const createWithdrawal = async (req, res, next) => {
    try {
        const { toAddress, memo, amount } = req.body;

        if (!toAddress || typeof toAddress !== 'string' || !toAddress.trim()) {
            return sendError(res, 'Target Solana "To Address" is required.', 400);
        }

        try {
            new PublicKey(toAddress.trim());
        } catch (err) {
            return sendError(res, 'Invalid Solana public key in "To Address".', 400);
        }

        const memoVal = validateMemo(memo);
        if (!memoVal.isValid) {
            return sendError(res, memoVal.error, 400);
        }

        const amountVal = validateAmount(amount);
        if (!amountVal.isValid) {
            return sendError(res, amountVal.error, 400);
        }

        // Validate user wallet balance
        const user = await User.findById(req.user._id);
        if (!user) {
            return sendError(res, 'User session not found.', 401);
        }

        const currentBalance = user.walletBalance || 0;
        if (amountVal.numericAmount > currentBalance) {
            return sendError(
                res,
                `Insufficient wallet balance. Maximum withdrawable balance is ${currentBalance.toFixed(6)} SOL.`,
                400
            );
        }

        const withdrawId = `WITH-${uuidv4().substring(0, 8).toUpperCase()}`;

        const withdrawal = new Withdrawal({
            userId: user._id,
            withdrawId,
            toAddress: toAddress.trim(),
            memo: memoVal.cleanMemo,
            amount: amountVal.numericAmount,
            status: 'PENDING',
        });

        await withdrawal.save();

        try {
            const txResult = await executeWithdrawalTransaction({
                toAddress: toAddress.trim(),
                memo: memoVal.cleanMemo,
                amount: amountVal.numericAmount,
            });

            withdrawal.transactionSignature = txResult.signature;
            withdrawal.fromAddress = txResult.fromAddress;
            withdrawal.status = 'CONFIRMED';
            withdrawal.confirmedAt = new Date();

            await withdrawal.save();

            // Deduct amount from user wallet balance
            user.walletBalance = Math.max(0, user.walletBalance - withdrawal.amount);
            await user.save();

            // Create notification record
            const notification = await Notification.create({
                userId: user._id,
                title: 'Withdrawal Successful!',
                message: `Successfully withdrew ${withdrawal.amount} SOL to ${withdrawal.toAddress}.`,
                type: 'WITHDRAWAL',
                amount: withdrawal.amount,
                transactionSignature: withdrawal.transactionSignature,
            });

            // Emit real-time notification via Socket.io
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${user._id}`).emit('notification', {
                    notification,
                    newBalance: user.walletBalance,
                });
            }

            return sendSuccess(
                res,
                {
                    withdrawId: withdrawal.withdrawId,
                    signature: withdrawal.transactionSignature,
                    fromAddress: withdrawal.fromAddress,
                    toAddress: withdrawal.toAddress,
                    status: withdrawal.status,
                    amount: withdrawal.amount,
                    memo: withdrawal.memo,
                    confirmedAt: withdrawal.confirmedAt,
                    createdAt: withdrawal.createdAt,
                    updatedWalletBalance: user.walletBalance,
                    message: 'Withdrawal completed successfully on Solana blockchain!',
                },
                201
            );
        } catch (txErr) {
            withdrawal.status = 'FAILED';
            withdrawal.failureReason = txErr.message;
            await withdrawal.save();

            console.error('createWithdrawal Error----------->', txErr.message);
            return sendError(res, txErr.message || 'Solana withdrawal transaction failed', 400);
        }
    } catch (err) {
        console.error('createWithdrawal Error Message----------->', err.message);
        return sendError(res, 'Internal server error during withdrawal', 500);
    }
};

const getWithdrawals = async (req, res, next) => {
    try {
        const userId = req.user ? req.user._id : null;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const query = userId ? { userId } : {};

        const [withdrawals, total] = await Promise.all([
            Withdrawal.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Withdrawal.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return sendSuccess(res, {
            withdrawals,
            pagination: {
                total,
                page,
                limit,
                totalPages,
            },
        });
    } catch (err) {
        console.error('getWithdrawals Error----------->', err.message);
        return sendError(res, 'Failed to retrieve withdrawal list', 500);
    }
};

module.exports = {
    createWithdrawal,
    getWithdrawals,
};