'use strict';

const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const { generateNewPlatformAddress } = require('../../../../services/solana.service');

export async function POST() {
    try {
        await connectDatabase();
        log1('[API POST /api/deposit/generate-address] Generating new address...');
        const newPubKey = await generateNewPlatformAddress();

        return success({
            exists: true,
            address: newPubKey.toBase58(),
            network: process.env.SOLANA_NETWORK || 'devnet',
            message: 'Brand new platform deposit address generated successfully!',
        });
    } catch (err) {
        log1('POST /api/deposit/generate-address Error----------->', err.message);
        return error('Something went wrong, please try again later.', 500);
    }
}
