'use strict';

const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const Withdrawal = require('../../../../models/withdrawal.model');

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await connectDatabase();
        log1('[API GET /api/withdraw/list] Fetching withdrawals...');
        const withdrawals = await Withdrawal.find()
            .sort({ createdAt: -1 })
            .limit(100);

        return success({ withdrawals });
    } catch (err) {
        log1('GET /api/withdraw/list Error----------->', err.message);
        return error('Failed to retrieve withdrawal list', 500);
    }
}
