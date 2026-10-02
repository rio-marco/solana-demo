'use strict';

const express = require('express');
const router = express.Router();
const depositController = require('../controllers/deposit.controller');

router.get('/address', depositController.getAddress);
router.post('/address/generate', depositController.generateAddress);
router.get('/balance', depositController.getBalance);
router.post('/create', depositController.createDeposit);
router.post('/verify', depositController.verifyDeposit);
router.get('/:depositId', depositController.getDepositById);

module.exports = router;
