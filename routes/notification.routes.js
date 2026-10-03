const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, notificationController.getNotifications);
router.post('/read-all', authMiddleware, notificationController.markAllAsRead);

module.exports = router;