'use strict';

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { isAuthenticatedApi } = require('../middleware/auth.middleware');

router.get('/', isAuthenticatedApi, notificationController.getNotifications);
router.post('/read-all', isAuthenticatedApi, notificationController.markAllAsRead);

module.exports = router;
