'use strict';

const express = require('express');
const router = express.Router();
const withdrawController = require('../controllers/withdraw.controller');

router.post('/create', withdrawController.createWithdrawal);
router.get('/list', withdrawController.getWithdrawals);

module.exports = router;