'use strict';

const express = require('express');
const router = express.Router();
const withdrawController = require('../controllers/withdraw.controller');
const { isAuthenticatedApi } = require('../middleware/auth.middleware');

router.post('/create', isAuthenticatedApi, withdrawController.createWithdrawal);
router.get('/list', isAuthenticatedApi, withdrawController.getWithdrawals);

module.exports = router;