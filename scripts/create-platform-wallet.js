'use strict';

const mongoose = require('mongoose');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
require('dotenv').config();

const connectDatabase = require('../config/database');
const Setting = require('../models/setting.model');

(async () => {
    try {
        await connectDatabase();

        let platformPrivSetting = await Setting.getVal('SOLANA_PLATFORM_PRIVATE_KEY');
        let platformKeypair;

        if (platformPrivSetting && !platformPrivSetting.startsWith('YOUR_')) {
            try {
                const decoded = bs58.decode(platformPrivSetting.trim());
                platformKeypair = Keypair.fromSecretKey(decoded);
                console.log(`[Platform Wallet] Existing loaded: ${platformKeypair.publicKey.toBase58()}`);
            } catch (e) {
                platformKeypair = Keypair.generate();
                console.log(`[Platform Wallet] NEW generated: ${platformKeypair.publicKey.toBase58()}`);
            }
        } else {
            platformKeypair = Keypair.generate();
            console.log(`[Platform Wallet] NEW generated: ${platformKeypair.publicKey.toBase58()}`);
        }

        let senderPrivSetting = await Setting.getVal('SOLANA_SENDER_PRIVATE_KEY');
        let senderKeypair;

        if (senderPrivSetting && !senderPrivSetting.startsWith('YOUR_')) {
            try {
                const decoded = bs58.decode(senderPrivSetting.trim());
                senderKeypair = Keypair.fromSecretKey(decoded);
                console.log(`[Sender Wallet] Existing loaded: ${senderKeypair.publicKey.toBase58()}`);
            } catch (e) {
                senderKeypair = Keypair.generate();
                console.log(`[Sender Wallet] NEW generated: ${senderKeypair.publicKey.toBase58()}`);
            }
        } else {
            senderKeypair = Keypair.generate();
            console.log(`[Sender Wallet] NEW generated: ${senderKeypair.publicKey.toBase58()}`);
        }

        const platformPub = platformKeypair.publicKey.toBase58();
        const platformPriv = bs58.encode(platformKeypair.secretKey);

        const senderPub = senderKeypair.publicKey.toBase58();
        const senderPriv = bs58.encode(senderKeypair.secretKey);

        // Save into Database Setting collection
        await Setting.setVal('SOLANA_PLATFORM_PUBLIC_KEY', platformPub, 'Solana platform receiving public key');
        await Setting.setVal('SOLANA_PLATFORM_PRIVATE_KEY', platformPriv, 'Solana platform receiving private key');
        await Setting.setVal('SOLANA_SENDER_PUBLIC_KEY', senderPub, 'Demo sender wallet public key');
        await Setting.setVal('SOLANA_SENDER_PRIVATE_KEY', senderPriv, 'Demo sender wallet private key');

        console.log('\n✅ Keypairs generated and saved to MongoDB Setting table successfully!');
        console.log(`Platform Public Key: ${platformPub}`);
        console.log(`Sender Public Key:   ${senderPub}\n`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating platform wallet:', err.message);
        process.exit(1);
    }
})();
