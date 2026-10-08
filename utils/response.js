'use strict';

const { NextResponse } = require('next/server');
const { log1 } = require('./general');

/**
 * Common success response builder for Next.js API route handlers.
 * Can be invoked as success(data, statusCode) or sendSuccess(res, data, statusCode)
 */
const success = (data = {}, statusCode = 200) => {
    log1(`[SUCCESS ${statusCode}]`, typeof data === 'string' ? data : (data.message || 'Operation successful'));
    return NextResponse.json(
        {
            success: true,
            ...data,
        },
        { status: statusCode }
    );
};

const sendSuccess = (resOrData = {}, dataOrCode = {}, statusCode = 200) => {
    // If first param is express-like res with status function (backward compatibility)
    if (resOrData && typeof resOrData.status === 'function') {
        const code = typeof dataOrCode === 'number' ? dataOrCode : statusCode;
        const payload = typeof dataOrCode === 'object' ? dataOrCode : {};
        log1(`[SUCCESS ${code}]`, payload.message || 'Operation successful');
        return resOrData.status(code).json({
            success: true,
            ...payload,
        });
    }

    // Default Next.js App Router signature: sendSuccess(data, statusCode)
    const data = typeof resOrData === 'object' ? resOrData : {};
    const status = typeof dataOrCode === 'number' ? dataOrCode : statusCode;
    return success(data, status);
};

/**
 * Common error response builder for Next.js API route handlers.
 * Can be invoked as error(message, statusCode, errors) or sendError(res, message, statusCode, errors)
 */
const error = (message = 'An error occurred', statusCode = 400, errors = null) => {
    log1(`[ERROR ${statusCode}]`, message);
    const payload = {
        success: false,
        message,
    };

    if (errors) {
        payload.errors = errors;
    }

    return NextResponse.json(payload, { status: statusCode });
};

const sendError = (resOrMessage = 'An error occurred', messageOrStatus = 'An error occurred', statusCode = 400, errors = null) => {
    // Express-like signature: sendError(res, message, statusCode, errors)
    if (resOrMessage && typeof resOrMessage.status === 'function') {
        const msg = typeof messageOrStatus === 'string' ? messageOrStatus : 'An error occurred';
        const code = typeof statusCode === 'number' ? statusCode : 400;
        const errs = errors || (typeof statusCode === 'object' ? statusCode : null);
        log1(`[ERROR ${code}]`, msg);
        const payload = {
            success: false,
            message: msg,
        };
        if (errs) payload.errors = errs;
        return resOrMessage.status(code).json(payload);
    }

    // Next.js App Router signature: sendError(message, statusCode, errors)
    const msg = typeof resOrMessage === 'string' ? resOrMessage : 'An error occurred';
    const code = typeof messageOrStatus === 'number' ? messageOrStatus : 400;
    const errs = statusCode && typeof statusCode === 'object' ? statusCode : errors;
    return error(msg, code, errs);
};

module.exports = {
    log1,
    success,
    sendSuccess,
    error,
    sendError,
};