'use strict';

const { v4: uuidv4 } = require('uuid');
const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const { validateMemo, validateAmount } = require('../../../../utils/validation');
const { getPlatformReceivingAddress, executeDepositTransaction } = require('../../../../services/solana.service');
const { verifyDepositTransaction } = require('../../../../services/transaction-verification.service');
const Deposit = require('../../../../models/deposit.model');

export async function POST(request) {
    try {
        await connectDatabase();
        const body = await request.json();
        const { memo, amount } = body || {};

        log1('[API POST /api/deposit/create]', { memo, amount });

        const memoVal = validateMemo(memo);
        if (!memoVal.isValid) {
            return error(memoVal.error, 400);
        }

        const amountVal = validateAmount(amount);
        if (!amountVal.isValid) {
            return error(amountVal.error, 400);
        }

        const platformPubKey = await getPlatformReceivingAddress(true);
        const platformAddressStr = platformPubKey.toBase58();

        const depositId = `DEP-${uuidv4().substring(0, 8).toUpperCase()}`;

        const deposit = new Deposit({
            depositId,
            memo: memoVal.cleanMemo,
            amount: amountVal.numericAmount,
            platformAddress: platformAddressStr,
            status: 'PENDING',
            requestedAt: new Date(),
        });

        await deposit.save();

        let txResult;
        try {
            txResult = await executeDepositTransaction({
                memo: memoVal.cleanMemo,
                amount: amountVal.numericAmount,
                recipientPublicKey: platformPubKey,
            });

            deposit.transactionSignature = txResult.signature;
            deposit.status = 'PROCESSING';
            deposit.submittedAt = new Date();
            await deposit.save();
        } catch (txErr) {
            deposit.status = 'FAILED';
            deposit.failureReason = txErr.message;
            await deposit.save();

            log1('executeDepositTransaction Error----------->', txErr.message);
            return error(txErr.message || 'Solana transaction failed', 400);
        }

        const verification = await verifyDepositTransaction({
            signature: txResult.signature,
            expectedAddress: platformAddressStr,
            expectedAmount: amountVal.numericAmount,
            expectedMemo: memoVal.cleanMemo,
        });

        if (verification.isValid) {
            deposit.status = 'CONFIRMED';
            deposit.confirmedAt = new Date();
            deposit.slot = verification.slot;
            deposit.blockTime = verification.blockTime;

            await deposit.save();

            return success({
                depositId: deposit.depositId,
                signature: deposit.transactionSignature,
                status: deposit.status,
                amount: deposit.amount,
                memo: deposit.memo,
                confirmedAt: deposit.confirmedAt,
                slot: deposit.slot,
                message: 'Deposit created and verified on Solana blockchain!',
            }, 201);
        } else {
            deposit.status = 'FAILED';
            deposit.failureReason = verification.failureReason;
            await deposit.save();

            log1('verifyDepositTransaction failureReason Error----------->', verification.failureReason);
            return error('Transaction created but on-chain verification failed', 400);
        }
    } catch (err) {
        log1('POST /api/deposit/create Error Message----------->', err.message);
        return error('Internal server error', 500);
    }
}
