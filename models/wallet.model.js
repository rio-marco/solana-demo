'use strict';

const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema(
    {
        publicKey: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        network: {
            type: String,
            default: 'devnet',
            enum: ['devnet', 'testnet', 'mainnet-beta'],
        },
        type: {
            type: String,
            default: 'PLATFORM_DEPOSIT',
            enum: ['PLATFORM_DEPOSIT', 'DEMO_SENDER'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
);

WalletSchema.index({
    type: 1,
    isActive: 1,
});

WalletSchema.statics.getOrCreatePlatformWallet = async function (publicKeyStr, networkName = 'devnet') {
    let wallet = await this.findOne({ type: 'PLATFORM_DEPOSIT', isActive: true });

    if (!wallet && publicKeyStr) {
        wallet = await this.create({
            publicKey: publicKeyStr,
            network: networkName,
            type: 'PLATFORM_DEPOSIT',
            isActive: true,
        });
    } else if (wallet && publicKeyStr && wallet.publicKey !== publicKeyStr) {
        wallet.publicKey = publicKeyStr;
        wallet.network = networkName;
        await wallet.save();
    };

    return wallet;
};

module.exports = mongoose.model('Wallet', WalletSchema);