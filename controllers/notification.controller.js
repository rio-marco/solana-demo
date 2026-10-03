'use strict';

const Notification = require('../models/notification.model');
const { sendSuccess, sendError } = require('../utils/response');

const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments({ userId }),
            Notification.countDocuments({ userId, isRead: false }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;

        return sendSuccess(res, {
            notifications,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                unreadCount,
            },
        });
    } catch (err) {
        console.error('[Get Notifications Error]:', err.message);
        return sendError(res, 'Failed to fetch notifications.', 500);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user._id;
        await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
        return sendSuccess(res, { message: 'All notifications marked as read.' });
    } catch (err) {
        console.error('[Mark Read Notifications Error]:', err.message);
        return sendError(res, 'Failed to mark notifications as read.', 500);
    }
};

module.exports = {
    getNotifications,
    markAllAsRead,
};
