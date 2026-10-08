'use strict';

/**
 * General logger function log1
 * Formats log messages with timestamps and clean output.
 */
const log1 = (...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[LOG1] [${timestamp}]`, ...args);
};

module.exports = {
    log1,
};
