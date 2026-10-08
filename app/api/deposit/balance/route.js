'use strict';

const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const { getPlatformReceivingAddress, getOnChainBalance } = require('../../../../services/solana.service');

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectDatabase();
        log1('[API GET /api/deposit/balance] Fetching platform wallet balance...');
        const platformPubKey = await getPlatformReceivingAddress(true);

        if (!platformPubKey) {
            return error('Platform receiving address is not generated yet.', 404);
        }

        const balanceData = await getOnChainBalance(platformPubKey);

        return success({
            address: platformPubKey.toBase58(),
            balance: balanceData.balance,
            lamports: balanceData.lamports,
            currency: balanceData.currency,
        });
    } catch (err) {
        log1('GET /api/deposit/balance Error----------->', err.message);
        return error('Something went wrong, please try again later.', 500);
    }
}
