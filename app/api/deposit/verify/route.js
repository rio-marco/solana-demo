'use strict';

const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const { verifyDepositTransaction } = require('../../../../services/transaction-verification.service');
const Deposit = require('../../../../models/deposit.model');

export async function POST(request) {
    try {
        await connectDatabase();
        const body = await request.json();
        const { depositId, signature } = body || {};

        log1('[API POST /api/deposit/verify]', { depositId, signature });

        if (!depositId && !signature) {
            return error('Please provide either depositId or signature', 400);
        }

        let deposit;
        if (depositId) {
            deposit = await Deposit.findOne({ depositId });
        } else {
            deposit = await Deposit.findOne({ transactionSignature: signature });
        }

        if (!deposit) {
            return error('Deposit record not found', 404);
        }

        const targetSignature = signature || deposit.transactionSignature;

        if (!targetSignature) {
            return error('Deposit record does not have a valid transaction signature', 400);
        }

        const verification = await verifyDepositTransaction({
            signature: targetSignature,
            expectedAddress: deposit.platformAddress,
            expectedAmount: deposit.amount,
            expectedMemo: deposit.memo,
        });

        if (verification.isValid) {
            deposit.status = 'CONFIRMED';
            deposit.transactionSignature = targetSignature;
            deposit.confirmedAt = new Date();
            deposit.slot = verification.slot;
            deposit.blockTime = verification.blockTime;
            deposit.failureReason = null;

            await deposit.save();

            return success({
                depositId: deposit.depositId,
                status: deposit.status,
                signature: deposit.transactionSignature,
                amount: deposit.amount,
                memo: deposit.memo,
                slot: deposit.slot,
                confirmedAt: deposit.confirmedAt,
            });
        } else {
            deposit.status = 'FAILED';
            deposit.failureReason = verification.failureReason;
            await deposit.save();

            log1('verifyDeposit verification failureReason Error----------->', verification.failureReason);
            return error('On-chain verification failed: ' + verification.failureReason, 400);
        }
    } catch (err) {
        log1('POST /api/deposit/verify Error----------->', err.message);
        return error('Something went wrong, please try again later.', 500);
    }
}
