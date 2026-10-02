'use strict';

const { PublicKey } = require('@solana/web3.js');

const LAMPORTS_PER_SOL = 1000000000; // 10^9

const validateMemo = (memo) => {
    if (memo === undefined || memo === null) {
        return { isValid: false, error: 'Memo is required' };
    };

    const trimmed = String(memo).trim();

    if (trimmed.length < 1) {
        return { isValid: false, error: 'Memo cannot be empty' };
    };

    if (trimmed.length > 100) {
        return { isValid: false, error: 'Memo cannot exceed 100 characters' };
    };

    if (/[\x00-\x1F\x7F]/.test(trimmed)) {
        return { isValid: false, error: 'Memo contains invalid control characters' };
    };

    return { isValid: true, cleanMemo: trimmed };
};

const validateAmount = (amount) => {
    if (amount === undefined || amount === null || amount === '') {
        return { isValid: false, error: 'Amount is required' };
    };

    const num = Number(amount);

    if (isNaN(num) || !isFinite(num)) {
        return { isValid: false, error: 'Amount must be a valid number' };
    };

    if (num <= 0) {
        return { isValid: false, error: 'Amount must be greater than 0' };
    };

    if (num > 10000) {
        return { isValid: false, error: 'Amount exceeds maximum allowable limit of 10,000 SOL' };
    };

    const parts = String(amount).split('.');
    if (parts[1] && parts[1].length > 9) {
        return { isValid: false, error: 'Amount exceeds maximum Solana precision of 9 decimal places' };
    };

    try {
        const lamports = solToLamports(num);
        return { isValid: true, numericAmount: num, lamports };
    } catch (err) {
        return { isValid: false, error: `Invalid amount formatting: ${err.message}` };
    };
};

const solToLamports = (sol) => {
    const str = String(sol);
    const [integerPart, decimalPart = ''] = str.split('.');
    const paddedDecimal = decimalPart.padEnd(9, '0').slice(0, 9);
    const fullLamportStr = integerPart + paddedDecimal;

    return BigInt(fullLamportStr);
};

const lamportsToSol = (lamports) => {
    const lamportBigInt = BigInt(lamports);
    const solNumber = Number(lamportBigInt) / LAMPORTS_PER_SOL;

    return solNumber;
};

const isValidSolanaAddress = (address) => {
    if (!address || typeof address !== 'string') return false;

    try {
        const pubKey = new PublicKey(address);
        return PublicKey.isOnCurve(pubKey.toBuffer());
    } catch (e) {
        return false;
    };
};

module.exports = {
    validateMemo,
    validateAmount,
    solToLamports,
    lamportsToSol,
    isValidSolanaAddress,
    LAMPORTS_PER_SOL,
};