'use strict';

const { v4: uuidv4 } = require('uuid');
const { PublicKey } = require('@solana/web3.js');
const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const { validateMemo, validateAmount } = require('../../../../utils/validation');
const { executeWithdrawalTransaction } = require('../../../../services/solana.service');
const Withdrawal = require('../../../../models/withdrawal.model');

export async function POST(request) {
    try {
        await connectDatabase();
        const body = await request.json();
        const { toAddress, memo, amount } = body || {};

        log1('[API POST /api/withdraw/create]', { toAddress, memo, amount });

        if (!toAddress || typeof toAddress !== 'string' || !toAddress.trim()) {
            return error('Target Solana "To Address" is required.', 400);
        };

        try {
            new PublicKey(toAddress.trim());
        } catch (err) {
            return error('Invalid Solana public key in "To Address".', 400);
        };

        const memoVal = validateMemo(memo);
        if (!memoVal.isValid) {
            return error(memoVal.error, 400);
        };

        const amountVal = validateAmount(amount);
        if (!amountVal.isValid) {
            return error(amountVal.error, 400);
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

            return success({
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

            log1('executeWithdrawalTransaction Error----------->', txErr.message);
            return error(txErr.message || 'Solana withdrawal transaction failed', 400);
        };
    } catch (err) {
        log1('POST /api/withdraw/create Error Message----------->', err.message);
        return error('Internal server error during withdrawal', 500);
    };
};