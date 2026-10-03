'use strict';

const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError } = require('../utils/response');
const { validateMemo, validateAmount } = require('../utils/validation');
const { hasPlatformAddress, generateNewPlatformAddress, getPlatformReceivingAddress, getOnChainBalance, executeDepositTransaction } = require('../services/solana.service');
const { verifyDepositTransaction } = require('../services/transaction-verification.service');
const Deposit = require('../models/deposit.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');

const getAddress = async (req, res, next) => {
    try {
        const isSet = await hasPlatformAddress();
        const shouldForceGenerate = req.query.generate === 'true' || req.query.force === 'true';

        if (shouldForceGenerate) {
            const newPubKey = await generateNewPlatformAddress();
            return sendSuccess(res, {
                exists: true,
                address: newPubKey.toBase58(),
                network: process.env.SOLANA_NETWORK || 'devnet',
                message: 'New platform receiving address generated successfully!',
            });
        }

        if (isSet) {
            const platformPubKey = await getPlatformReceivingAddress(true);
            return sendSuccess(res, {
                exists: true,
                address: platformPubKey.toBase58(),
                network: process.env.SOLANA_NETWORK || 'devnet',
            });
        }

        return sendSuccess(res, {
            exists: false,
            address: null,
            network: process.env.SOLANA_NETWORK || 'devnet',
            message: 'Platform receiving address is not generated yet.',
        });
    } catch (err) {
        console.error("getAddress Error----------->", err.message);
        return sendError(res, "Something went Wrong, please try again later.", 500);
    }
};

const generateAddress = async (req, res, next) => {
    try {
        const newPubKey = await generateNewPlatformAddress();

        return sendSuccess(res, {
            exists: true,
            address: newPubKey.toBase58(),
            network: process.env.SOLANA_NETWORK || 'devnet',
            message: 'Brand new platform deposit address generated successfully!',
        });
    } catch (err) {
        console.error("generateAddress Error----------->", err.message);
        return sendError(res, "Something went Wrong, please try again later.", 500);
    }
};

const getBalance = async (req, res, next) => {
    try {
        const platformPubKey = await getPlatformReceivingAddress(true);
        const balanceData = await getOnChainBalance(platformPubKey);

        return sendSuccess(res, {
            address: platformPubKey.toBase58(),
            balance: balanceData.balance,
            lamports: balanceData.lamports,
            currency: balanceData.currency,
        });
    } catch (err) {
        console.error("getBalance Error----------->", err.message);
        return sendError(res, "Something went Wrong, please try again later.", 500);
    }
};

const createDeposit = async (req, res, next) => {
    try {
        const { memo, amount } = req.body;

        const memoVal = validateMemo(memo);
        if (!memoVal.isValid) {
            return sendError(res, memoVal.error, 400);
        }

        const amountVal = validateAmount(amount);
        if (!amountVal.isValid) {
            return sendError(res, amountVal.error, 400);
        }

        const platformPubKey = await getPlatformReceivingAddress(true);
        const platformAddressStr = platformPubKey.toBase58();

        const depositId = `DEP-${uuidv4().substring(0, 8).toUpperCase()}`;

        const deposit = new Deposit({
            userId: req.user ? req.user._id : null,
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

            console.error("createDeposit Error----------->", txErr.message);
            return sendError(res, "Solana transaction failed", 400);
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

            // Update user wallet balance if authenticated user
            let updatedUserBalance = 0;
            if (req.user) {
                const user = await User.findById(req.user._id);
                if (user) {
                    user.walletBalance = (user.walletBalance || 0) + deposit.amount;
                    await user.save();
                    updatedUserBalance = user.walletBalance;

                    // Create real-time notification
                    const notification = await Notification.create({
                        userId: user._id,
                        title: 'Deposit Confirmed!',
                        message: `Deposit of ${deposit.amount} SOL confirmed on chain.`,
                        type: 'DEPOSIT',
                        amount: deposit.amount,
                        transactionSignature: deposit.transactionSignature,
                    });

                    // Real-time socket alert
                    const io = req.app.get('io');
                    if (io) {
                        io.to(`user_${user._id}`).emit('notification', {
                            notification,
                            newBalance: updatedUserBalance,
                        });
                    }
                }
            }

            return sendSuccess(res, {
                depositId: deposit.depositId,
                signature: deposit.transactionSignature,
                status: deposit.status,
                amount: deposit.amount,
                memo: deposit.memo,
                confirmedAt: deposit.confirmedAt,
                slot: deposit.slot,
                updatedWalletBalance: updatedUserBalance,
                message: 'Deposit created and verified on Solana blockchain!',
            }, 201);
        } else {
            deposit.status = 'FAILED';
            deposit.failureReason = verification.failureReason;
            await deposit.save();

            console.error("createDeposit verification failureReason Error----------->", verification.failureReason);
            return sendError(res, "Transaction created but on-chain verification failed", 400);
        }
    } catch (err) {
        console.error("createDeposit Error Message----------->", err.message);
        return sendError(res, "Internal server error", 500);
    }
};

const verifyDeposit = async (req, res, next) => {
    try {
        const { depositId, signature } = req.body;

        if (!depositId && !signature) {
            return sendError(res, 'Please provide either depositId or signature', 400);
        }

        let deposit;
        if (depositId) {
            deposit = await Deposit.findOne({ depositId });
        } else {
            deposit = await Deposit.findOne({ transactionSignature: signature });
        }

        if (!deposit) {
            return sendError(res, 'Deposit record not found', 404);
        }

        const targetSignature = signature || deposit.transactionSignature;

        if (!targetSignature) {
            return sendError(res, 'Deposit record does not have a valid transaction signature', 400);
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

            // Update user wallet balance if deposit belongs to user
            let updatedUserBalance = 0;
            if (deposit.userId) {
                const user = await User.findById(deposit.userId);
                if (user) {
                    user.walletBalance = (user.walletBalance || 0) + deposit.amount;
                    await user.save();
                    updatedUserBalance = user.walletBalance;

                    const notification = await Notification.create({
                        userId: user._id,
                        title: 'Deposit Confirmed!',
                        message: `Deposit of ${deposit.amount} SOL verified and added to wallet balance.`,
                        type: 'DEPOSIT',
                        amount: deposit.amount,
                        transactionSignature: deposit.transactionSignature,
                    });

                    const io = req.app.get('io');
                    if (io) {
                        io.to(`user_${user._id}`).emit('notification', {
                            notification,
                            newBalance: updatedUserBalance,
                        });
                    }
                }
            }

            return sendSuccess(res, {
                depositId: deposit.depositId,
                status: deposit.status,
                signature: deposit.transactionSignature,
                amount: deposit.amount,
                memo: deposit.memo,
                slot: deposit.slot,
                confirmedAt: deposit.confirmedAt,
                updatedWalletBalance: updatedUserBalance,
            });
        } else {
            deposit.status = 'FAILED';
            deposit.failureReason = verification.failureReason;
            await deposit.save();

            console.error("verifyDeposit verification failureReason Error----------->", verification.failureReason);
            return sendError(res, "On-chain verification failed", 400);
        }
    } catch (err) {
        console.error("verifyDeposit Error----------->", err.message);
        return sendError(res, "Something went Wrong, please try again later.", 500);
    }
};

const getDepositById = async (req, res, next) => {
    try {
        const { depositId } = req.params;
        const deposit = await Deposit.findOne({ depositId });

        if (!deposit) {
            return sendError(res, 'Deposit record not found', 404);
        }

        return sendSuccess(res, { deposit });
    } catch (err) {
        console.error("getDepositById Error----------->", err.message);
        return sendError(res, "Something went Wrong, please try again later.", 500);
    }
};

module.exports = {
    getAddress,
    generateAddress,
    getBalance,
    createDeposit,
    verifyDeposit,
    getDepositById,
};