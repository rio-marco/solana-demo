'use strict';

const { sendSuccess, sendError } = require('../utils/response');
const { decodeTransactionDetails } = require('../services/solana.service');

const decodeTransaction = async (req, res, next) => {
    try {
        const signature = req.body.transactionId || req.body.signature || req.query.signature;

        if (!signature || typeof signature !== 'string' || !signature.trim()) {
            return sendError(res, 'Please provide a valid Transaction Id / signature.', 400);
        };

        const transactionData = await decodeTransactionDetails(signature.trim());

        return sendSuccess(res, {
            transactionId: signature.trim(),
            transaction: transactionData,
        });
    } catch (err) {
        console.error("decodeTransaction Error----------->", err.message);
        return sendError(res, err.message || "Failed to decode transaction", 400);
    };
};

module.exports = {
    decodeTransaction,
};