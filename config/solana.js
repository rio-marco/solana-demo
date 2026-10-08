'use strict';

const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const { log1 } = require('../utils/general');
const connectDatabase = require('./database');
const Setting = require('../models/setting.model');

const network = process.env.SOLANA_NETWORK || 'devnet';
const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const commitment = process.env.SOLANA_COMMITMENT || 'confirmed';

const memoProgramIdStr = process.env.SOLANA_MEMO_PROGRAM_ID || 'MemoSouSp6gQWMwEndBWWeGQayoJ928rwVncb7q6StV';
const MEMO_PROGRAM_ID = new PublicKey(memoProgramIdStr);

const connection = new Connection(rpcUrl, {
    commitment,
    confirmTransactionInitialTimeout: 60000,
});

const parseKeypair = (keyString) => {
    if (!keyString || keyString.startsWith('YOUR_')) return null;

    try {
        const trimmed = keyString.trim();

        if (trimmed.startsWith('[')) {
            const arr = Uint8Array.from(JSON.parse(trimmed));
            return Keypair.fromSecretKey(arr);
        } else {
            const decoded = bs58.decode(trimmed);
            return Keypair.fromSecretKey(decoded);
        }
    } catch (err) {
        log1(`[Solana Config Error] Failed to parse keypair: ${err.message}`);
        return null;
    }
};

const getPlatformKeypairAsync = async () => {
    await connectDatabase();
    const privKeyStr = await Setting.getVal('SOLANA_PLATFORM_PRIVATE_KEY');
    return parseKeypair(privKeyStr);
};

const getSenderKeypairAsync = async () => {
    await connectDatabase();
    const privKeyStr = await Setting.getVal('SOLANA_SENDER_PRIVATE_KEY');
    return parseKeypair(privKeyStr);
};

const getPlatformPublicKeyAsync = async () => {
    await connectDatabase();
    const keypair = await getPlatformKeypairAsync();
    if (keypair) return keypair.publicKey;

    const pubKeyStr = await Setting.getVal('SOLANA_PLATFORM_PUBLIC_KEY');
    if (pubKeyStr && !pubKeyStr.startsWith('YOUR_')) {
        return new PublicKey(pubKeyStr);
    }

    return null;
};

module.exports = {
    connection,
    network,
    rpcUrl,
    commitment,
    MEMO_PROGRAM_ID,
    parseKeypair,
    getPlatformKeypairAsync,
    getSenderKeypairAsync,
    getPlatformPublicKeyAsync,
};