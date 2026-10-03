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
};