const constants = require('../config/constant');
const Generallib = require('../utils/lib/general.lib');
const messages = require('../utils/messages');
const User = require('../models/user.model');
const Session = require('../models/session.model');

const getDashboardPage = (req, res) => {
    try {
        const user = req.user;

        return res.render("home", {
            header: {},
            body: {
                user: req.user,
                network: process.env.SOLANA_NETWORK || 'devnet',
                rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            },
            footer: {
                js: ["home.js"],
            },
        });
    } catch (error) {
        Generallib.log1(["Error in getDashboardPage----->", error]);
        return res.json(Generallib.error_res(messages.unexpectedDataError));
    };
};

const logout = async (req, res) => {
    try {
        const userId = req.userId;
        const authToken = req.session?.user?.authToken;

        await Session.updateOne({ userId: new ObjectId(userId), authToken, status: constants.SESSION_STATUS.EXPIRED });

        req.session.destroy();

        return res.status(constants.STATUS.OK).json(Generallib.success_res("Sign out successfully."));
    } catch (error) {
        Generallib.log1(["Error in logout----->", error]);
        return res.status(constants.STATUS.INTERNAL_SERVER_ERROR).json(Generallib.error_res(messages.unexpectedDataError));
    };
};

module.exports = {
    getDashboardPage,
    logout,
};