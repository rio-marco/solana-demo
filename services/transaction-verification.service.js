'use strict';

const bs58 = require('bs58');
const { connection, MEMO_PROGRAM_ID } = require('../config/solana');
const { solToLamports } = require('../utils/validation');
const Deposit = require('../models/deposit.model');

const verifyDepositTransaction = async ({
    signature,
    expectedAddress,
    expectedAmount,
    expectedMemo,
}) => {
    const existingConfirmed = await Deposit.findOne({
        transactionSignature: signature,
        status: 'CONFIRMED',
    });

    if (existingConfirmed) {
        return {
            isValid: false,
            failureReason: 'Transaction signature has already been processed and confirmed',
            isDuplicate: true,
        };
    };

    let tx;
    try {
        tx = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment: process.env.SOLANA_COMMITMENT || 'confirmed',
        });
    } catch (err) {
        console.error(`[Verification Error] RPC error fetching transaction: ${err.message}`);

        return {
            isValid: false,
            failureReason: `RPC error retrieving transaction from Solana network: ${err.message}`,
        };
    };

    if (!tx) {
        return {
            isValid: false,
            failureReason: 'Transaction signature not found on Solana blockchain. It may be unconfirmed or invalid.',
        };
    };

    if (tx.meta && tx.meta.err !== null) {
        return {
            isValid: false,
            failureReason: `Solana transaction failed on-chain with error: ${JSON.stringify(tx.meta.err)}`,
            slot: tx.slot,
            blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : null,
        };
    };

    const expectedLamports = solToLamports(expectedAmount);
    let matchedDestination = false;
    let transferAmountLamports = BigInt(0);

    const accountKeys = tx.transaction.message.accountKeys.map((acc) =>
        typeof acc === 'string' ? acc : acc.pubkey.toBase58()
    );

    const recipientIndex = accountKeys.indexOf(expectedAddress);

    if (recipientIndex === -1) {
        return {
            isValid: false,
            failureReason: `Platform receiving address ${expectedAddress} is not involved in this transaction.`,
        };
    };

    if (tx.meta && tx.meta.preBalances && tx.meta.postBalances) {
        const preBal = BigInt(tx.meta.preBalances[recipientIndex] || 0);
        const postBal = BigInt(tx.meta.postBalances[recipientIndex] || 0);
        const netDifference = postBal - preBal;

        if (netDifference >= expectedLamports) {
            matchedDestination = true;
            transferAmountLamports = netDifference;
        };
    };

    const allInstructions = [
        ...tx.transaction.message.instructions,
        ...(tx.meta?.innerInstructions?.flatMap((i) => i.instructions) || []),
    ];

    for (const inst of allInstructions) {
        if (inst.program === 'system' && inst.parsed) {
            const type = inst.parsed.type;
            const info = inst.parsed.info;
            if ((type === 'transfer' || type === 'transferChecked') && info) {
                if (info.destination === expectedAddress) {
                    matchedDestination = true;
                    const parsedLamports = BigInt(info.lamports || 0);
                    if (parsedLamports === expectedLamports) {
                        transferAmountLamports = parsedLamports;
                    };
                };
            };
        };
    };

    if (!matchedDestination) {
        return {
            isValid: false,
            failureReason: `Destination address mismatch. Transaction did not transfer funds to platform address ${expectedAddress}.`,
        };
    };

    if (transferAmountLamports < expectedLamports) {
        return {
            isValid: false,
            failureReason: `Transferred amount mismatch. Expected ${expectedAmount} SOL (${expectedLamports.toString()} lamports), but found ${transferAmountLamports.toString()} lamports.`,
        };
    };

    let foundMemo = null;

    for (const inst of allInstructions) {
        const programIdStr = inst.programId ? (typeof inst.programId === 'string' ? inst.programId : inst.programId.toBase58()) : '';
        const isMemoProgram = programIdStr === MEMO_PROGRAM_ID.toBase58() || inst.program === 'spl-memo';

        if (isMemoProgram) {
            if (typeof inst.parsed === 'string') {
                foundMemo = inst.parsed;
            } else if (inst.parsed && typeof inst.parsed.memo === 'string') {
                foundMemo = inst.parsed.memo;
            } else if (inst.data) {
                try {
                    foundMemo = Buffer.from(bs58.decode(inst.data)).toString('utf-8');
                } catch (e) {
                    foundMemo = Buffer.from(inst.data, 'base64').toString('utf-8');
                };
            };

            if (foundMemo) break;
        };
    };

    if (!foundMemo) {
        return {
            isValid: false,
            failureReason: 'Transaction does not contain a Solana Memo Program instruction.',
        };
    };

    const cleanFoundMemo = foundMemo.trim();
    const cleanExpectedMemo = expectedMemo.trim();

    if (cleanFoundMemo !== cleanExpectedMemo) {
        return {
            isValid: false,
            failureReason: `Memo mismatch. Expected "${cleanExpectedMemo}", but on-chain Memo is "${cleanFoundMemo}".`,
            actualMemo: cleanFoundMemo,
        };
    };

    console.log(`[Verification Service] Transaction successfully verified!`);

    return {
        isValid: true,
        slot: tx.slot,
        blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : new Date(),
        actualMemo: cleanFoundMemo,
        actualLamports: transferAmountLamports.toString(),
        actualAmount: expectedAmount,
    };
};

module.exports = {
    verifyDepositTransaction,
};