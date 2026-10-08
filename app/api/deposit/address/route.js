'use strict';

const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const {
    hasPlatformAddress,
    generateNewPlatformAddress,
    getPlatformReceivingAddress,
} = require('../../../../services/solana.service');

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        await connectDatabase();
        const { searchParams } = new URL(request.url);
        const shouldForceGenerate = searchParams.get('generate') === 'true' || searchParams.get('force') === 'true';

        log1('[API GET /api/deposit/address] forceGenerate:', shouldForceGenerate);

        if (shouldForceGenerate) {
            const newPubKey = await generateNewPlatformAddress();
            return success({
                exists: true,
                address: newPubKey.toBase58(),
                network: process.env.SOLANA_NETWORK || 'devnet',
                message: 'New platform receiving address generated successfully!',
            });
        }

        const isSet = await hasPlatformAddress();
        if (isSet) {
            const platformPubKey = await getPlatformReceivingAddress(true);
            return success({
                exists: true,
                address: platformPubKey ? platformPubKey.toBase58() : null,
                network: process.env.SOLANA_NETWORK || 'devnet',
            });
        }

        return success({
            exists: false,
            address: null,
            network: process.env.SOLANA_NETWORK || 'devnet',
            message: 'Platform receiving address is not generated yet.',
        });
    } catch (err) {
        log1('GET /api/deposit/address Error----------->', err.message);
        return error('Something went wrong, please try again later.', 500);
    }
}
