'use strict';

const express = require('express');
const router = express.Router();
const depositController = require('../controllers/deposit.controller');
const { isAuthenticatedApi } = require('../middleware/auth.middleware');

router.get('/address', isAuthenticatedApi, depositController.getAddress);
router.post('/address/generate', isAuthenticatedApi, depositController.generateAddress);
router.get('/balance', isAuthenticatedApi, depositController.getBalance);
router.post('/create', isAuthenticatedApi, depositController.createDeposit);
router.post('/verify', isAuthenticatedApi, depositController.verifyDeposit);
router.get('/:depositId', isAuthenticatedApi, depositController.getDepositById);

module.exports = router;
