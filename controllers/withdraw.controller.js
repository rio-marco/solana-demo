'use strict';

const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError } = require('../utils/response');
const { validateMemo, validateAmount } = require('../utils/validation');
const { executeWithdrawalTransaction } = require('../services/solana.service');
const Withdrawal = require('../models/withdrawal.model');
const { PublicKey } = require('@solana/web3.js');

const createWithdrawal = async (req, res, next) => {
    try {
        const { toAddress, memo, amount } = req.body;

        if (!toAddress || typeof toAddress !== 'string' || !toAddress.trim()) {
            return sendError(res, 'Target Solana "To Address" is required.', 400);
        };

        try {
            new PublicKey(toAddress.trim());
        } catch (err) {
            return sendError(res, 'Invalid Solana public key in "To Address".', 400);
        };

        const memoVal = validateMemo(memo);
        if (!memoVal.isValid) {
            return sendError(res, memoVal.error, 400);
        };

        const amountVal = validateAmount(amount);
        if (!amountVal.isValid) {
            return sendError(res, amountVal.error, 400);
        };

        const withdrawId = `WITH-${uuidv4().substring(0, 8).toUpperCase()}`;

        const withdrawal = new Withdrawal({
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

            return sendSuccess(res, {
                withdrawId: withdrawal.withdrawId,
                signature: withdrawal.transactionSignature,
                fromAddress: withdrawal.fromAddress,
                toAddress: withdrawal.toAddress,
                status: withdrawal.status,
                amount: withdrawal.amount,
                memo: withdrawal.memo,
                confirmedAt: withdrawal.confirmedAt,
                createdAt: withdrawal.createdAt,
                message: 'Withdrawal completed successfully on Solana blockchain!',
            }, 201);
        } catch (txErr) {
            withdrawal.status = 'FAILED';
            withdrawal.failureReason = txErr.message;

            await withdrawal.save();

            console.error("createWithdrawal Error----------->", txErr.message);
            return sendError(res, txErr.message || "Solana withdrawal transaction failed", 400);
        };
    } catch (err) {
        console.error("createWithdrawal Error Message----------->", err.message);
        return sendError(res, "Internal server error during withdrawal", 500);
    };
};

const getWithdrawals = async (req, res, next) => {
    try {
        const withdrawals = await Withdrawal.find()
            .sort({ createdAt: -1 })
            .limit(100);

        return sendSuccess(res, { withdrawals });
    } catch (err) {
        console.error("getWithdrawals Error----------->", err.message);
        return sendError(res, "Failed to retrieve withdrawal list", 500);
    };
};

module.exports = {
    createWithdrawal,
    getWithdrawals,
};