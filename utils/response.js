'use strict';

const sendSuccess = (res, data = {}, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        ...data,
    });
};

const sendError = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
    const payload = {
        success: false,
        message,
    };

    if (errors) {
        payload.errors = errors;
    }

    return res.status(statusCode).json(payload);
};

module.exports = {
    sendSuccess,
    sendError,
};