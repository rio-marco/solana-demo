require("dotenv").config();

module.exports = {
    PLATFORM_NAME: "solana-system",
    SUPPORT_EMAIL: "support@solanasystem.com",
    CURRENT_TIMEZONE: process.env.TZ || "Asia/Kolkata",

    OTP_LENGTH: 6,

    OTP_EXPIRY_MINUTE: 1000 * 60 * 10, // in minute
    REDIS_OTP_EXPIRY_SECOND: 900, // 15 * 60 (in second)

    DEFAULT_ITEM_PER_PAGE: 10,
    DEFAULT_CURRENT_PAGE: 1,

    BCRYPT_SALT: 10,

    SESSION_MAX_AGE: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years

    STATUS: {
        OK: 200,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        NOT_FOUND: 404,
        INTERNAL_SERVER_ERROR: 500,
        MAINTENANCE_ERROR: 503,
    },

    USER_STATUS: {
        InACTIVE: 1,
        ACTIVE: 2,
        SUSPENDED: 3,
    },

    SESSION_STATUS: {
        EXPIRED: 0,
        ACTIVE: 1,
    },
};