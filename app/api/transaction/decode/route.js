'use strict';

const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const { decodeTransactionDetails } = require('../../../../services/solana.service');

export const dynamic = 'force-dynamic';

async function handleDecode(signature) {
    if (!signature || typeof signature !== 'string' || !signature.trim()) {
        return error('Please provide a valid Transaction Id / signature.', 400);
    }

    const transactionData = await decodeTransactionDetails(signature.trim());

    return success({
        transactionId: signature.trim(),
        transaction: transactionData,
    });
}

export async function POST(request) {
    try {
        await connectDatabase();
        const body = await request.json();
        const signature = body.transactionId || body.signature;
        log1('[API POST /api/transaction/decode]', signature);
        return await handleDecode(signature);
    } catch (err) {
        log1('POST /api/transaction/decode Error----------->', err.message);
        return error(err.message || 'Failed to decode transaction', 400);
    }
}

export async function GET(request) {
    try {
        await connectDatabase();
        const { searchParams } = new URL(request.url);
        const signature = searchParams.get('signature') || searchParams.get('transactionId');
        log1('[API GET /api/transaction/decode]', signature);
        return await handleDecode(signature);
    } catch (err) {
        log1('GET /api/transaction/decode Error----------->', err.message);
        return error(err.message || 'Failed to decode transaction', 400);
    }
}
