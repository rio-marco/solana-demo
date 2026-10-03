const { Router } = require('express');
const router = Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const depositRoutes = require('./deposit.routes');
const withdrawRoutes = require('./withdraw.routes');
const transactionRoutes = require('./transaction.routes');
const notificationRoutes = require('./notification.routes');

router.use('/', authRoutes);
router.use('/', userRoutes);
router.use('/deposit', depositRoutes);
router.use('/withdraw', withdrawRoutes);
router.use('/transaction', transactionRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;