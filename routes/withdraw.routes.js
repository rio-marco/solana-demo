'use strict';

const express = require('express');
const router = express.Router();
const withdrawController = require('../controllers/withdraw.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/create', authMiddleware, withdrawController.createWithdrawal);
router.get('/list', authMiddleware, withdrawController.getWithdrawals);

module.exports = router;