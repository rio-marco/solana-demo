'use strict';

const connectDatabase = require('../../../../config/database');
const { log1, success, error } = require('../../../../utils/response');
const Deposit = require('../../../../models/deposit.model');

export async function GET(request, { params }) {
    try {
        await connectDatabase();
        const { depositId } = params;
        log1('[API GET /api/deposit/[depositId]]', depositId);

        const deposit = await Deposit.findOne({ depositId });

        if (!deposit) {
            return error('Deposit record not found', 404);
        }

        return success({ deposit });
    } catch (err) {
        log1('GET /api/deposit/[depositId] Error----------->', err.message);
        return error('Something went wrong, please try again later.', 500);
    }
}
