'use strict';

const {
    Transaction,
    SystemProgram,
    TransactionInstruction,
    sendAndConfirmTransaction,
    PublicKey,
    Keypair,
} = require('@solana/web3.js');

const bs58 = require('bs58');

const {
    connection,
    MEMO_PROGRAM_ID,
    getPlatformPublicKeyAsync,
    getSenderKeypairAsync,
    getPlatformKeypairAsync,
} = require('../config/solana');

const { solToLamports, lamportsToSol } = require('../utils/validation');
const Wallet = require('../models/wallet.model');
const Setting = require('../models/setting.model');

const ESTIMATED_TX_FEE_LAMPORTS = BigInt(5000);

const hasPlatformAddress = async () => {
    const pubKey = await getPlatformPublicKeyAsync();
    if (pubKey) return true;

    const walletRecord = await Wallet.findOne({ type: 'PLATFORM_DEPOSIT', isActive: true });
    return !!walletRecord;
};

const generateNewPlatformAddress = async () => {
    const newKeypair = Keypair.generate();
    const newPubStr = newKeypair.publicKey.toBase58();
    const newPrivStr = bs58.encode(newKeypair.secretKey);

    await Wallet.updateMany({ type: 'PLATFORM_DEPOSIT' }, { isActive: false });

    await Wallet.create({
        publicKey: newPubStr,
        network: process.env.SOLANA_NETWORK || 'devnet',
        type: 'PLATFORM_DEPOSIT',
        isActive: true,
    });

    await Setting.setVal('SOLANA_PLATFORM_PUBLIC_KEY', newPubStr, 'Solana platform public key');
    await Setting.setVal('SOLANA_PLATFORM_PRIVATE_KEY', newPrivStr, 'Solana platform private key');

    return newKeypair.publicKey;
};

const getPlatformReceivingAddress = async (autoGenerate = true) => {
    let pubKey = await getPlatformPublicKeyAsync();

    if (!pubKey) {
        const walletRecord = await Wallet.findOne({ type: 'PLATFORM_DEPOSIT', isActive: true });
        if (walletRecord) {
            pubKey = new PublicKey(walletRecord.publicKey);
        };
    };

    if (!pubKey && autoGenerate) {
        pubKey = await generateNewPlatformAddress();
    };

    if (!pubKey) {
        return null;
    };

    await Wallet.getOrCreatePlatformWallet(pubKey.toBase58(), process.env.SOLANA_NETWORK || 'devnet');

    return pubKey;
};

const getOnChainBalance = async (address) => {
    try {
        const pubKey = typeof address === 'string' ? new PublicKey(address) : address;
        const lamports = await connection.getBalance(pubKey, 'confirmed');
        const solBalance = lamportsToSol(lamports);

        return {
            balance: solBalance,
            lamports: Number(lamports),
            currency: 'SOL',
        };
    } catch (err) {
        console.error(`[Solana RPC Error] Failed to fetch balance: ${err.message}`);
        throw new Error(`Failed to retrieve blockchain balance: ${err.message}`);
    };
};

const executeDepositTransaction = async ({ memo, amount, recipientPublicKey }) => {
    const senderKeypair = await getSenderKeypairAsync();

    if (!senderKeypair) {
        throw new Error('Demo sender wallet private key is not configured in Database setting. Run "npm run create-wallet" and "npm run airdrop".');
    };

    const lamports = solToLamports(amount);
    const totalRequiredLamports = lamports + ESTIMATED_TX_FEE_LAMPORTS;

    const senderBalanceLamports = BigInt(await connection.getBalance(senderKeypair.publicKey));

    if (senderBalanceLamports < totalRequiredLamports) {
        const solAvail = lamportsToSol(senderBalanceLamports);
        const requiredSol = lamportsToSol(totalRequiredLamports);

        if (senderBalanceLamports <= ESTIMATED_TX_FEE_LAMPORTS) {
            throw new Error(`Demo sender wallet has 0 SOL on devnet. Please run "npm run airdrop" or request SOL at https://faucet.solana.com/ for address: ${senderKeypair.publicKey.toBase58()}`);
        };

        throw new Error(
            `Insufficient sender balance on Devnet (${solAvail} SOL available). ` +
            `To send ${amount} SOL, you need ~${requiredSol} SOL (including transaction network fees). ` +
            `Try depositing a smaller amount like 0.1 SOL, or request more Devnet SOL at https://faucet.solana.com/`
        );
    };

    const transferInstruction = SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: lamports,
    });

    const memoInstruction = new TransactionInstruction({
        keys: [
            {
                pubkey: senderKeypair.publicKey,
                isSigner: true,
                isWritable: false,
            },
        ],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, 'utf-8'),
    });

    const transaction = new Transaction();
    transaction.add(transferInstruction);
    transaction.add(memoInstruction);

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderKeypair.publicKey;

    try {
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [senderKeypair],
            {
                commitment: process.env.SOLANA_COMMITMENT || 'confirmed',
                preflightCommitment: 'confirmed',
            },
        );

        return {
            signature,
            senderAddress: senderKeypair.publicKey.toBase58(),
            recipientAddress: recipientPublicKey.toBase58(),
            lamports: lamports.toString(),
            amount,
            memo,
        };
    } catch (sendErr) {
        let cleanMsg = sendErr.message;

        if (cleanMsg.includes('insufficient lamports')) {
            cleanMsg = `Insufficient funds for transfer + network fee. Available balance is lower than requested amount + network fee. Try a smaller amount like 0.1 SOL.`;
        };

        throw new Error(cleanMsg);
    };
};

const executeWithdrawalTransaction = async ({ toAddress, memo, amount }) => {
    let toPublicKey;
    try {
        toPublicKey = new PublicKey(toAddress);
    } catch (err) {
        throw new Error('Invalid Solana recipient address.');
    };

    let payerKeypair = await getPlatformKeypairAsync();

    if (!payerKeypair) {
        throw new Error('No active wallet configured to execute withdrawal.');
    };

    const lamports = solToLamports(amount);
    const totalRequiredLamports = lamports + ESTIMATED_TX_FEE_LAMPORTS;
    const payerBalanceLamports = BigInt(await connection.getBalance(payerKeypair.publicKey));

    if (payerBalanceLamports < totalRequiredLamports) {
        const solAvail = lamportsToSol(payerBalanceLamports);
        throw new Error(
            `Insufficient wallet balance for withdrawal (${solAvail} SOL available). ` +
            `Need ${amount} SOL + fee.`
        );
    };

    const transferInstruction = SystemProgram.transfer({
        fromPubkey: payerKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: lamports,
    });

    const memoInstruction = new TransactionInstruction({
        keys: [
            {
                pubkey: payerKeypair.publicKey,
                isSigner: true,
                isWritable: false,
            },
        ],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, 'utf-8'),
    });

    const transaction = new Transaction();
    transaction.add(transferInstruction);
    transaction.add(memoInstruction);

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerKeypair.publicKey;

    try {
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [payerKeypair],
            {
                commitment: process.env.SOLANA_COMMITMENT,
                preflightCommitment: 'confirmed',
            },
        );

        return {
            signature,
            fromAddress: payerKeypair.publicKey.toBase58(),
            toAddress: toPublicKey.toBase58(),
            lamports: lamports.toString(),
            amount,
            memo,
        };
    } catch (sendErr) {
        let cleanMsg = sendErr.message;
        if (cleanMsg.includes('insufficient lamports')) {
            cleanMsg = `Insufficient funds for withdrawal + fee.`;
        };

        throw new Error(cleanMsg);
    };
};

const decodeTransactionDetails = async (signature) => {
    if (!signature || typeof signature !== 'string') {
        throw new Error('Transaction ID / signature is required.');
    };

    const trimmed = signature.trim();
    const tx = await connection.getParsedTransaction(trimmed, {
        maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
        throw new Error("Transaction details not found on Solana blockchain.");
    };

    return tx;
};

module.exports = {
    hasPlatformAddress,
    generateNewPlatformAddress,
    getPlatformReceivingAddress,
    getOnChainBalance,
    executeDepositTransaction,
    executeWithdrawalTransaction,
    decodeTransactionDetails,
};