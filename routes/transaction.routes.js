'use strict';

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');

router.post('/decode', transactionController.decodeTransaction);
router.get('/decode/:signature', (req, res, next) => {
    req.body.signature = req.params.signature;
    transactionController.decodeTransaction(req, res, next);
});

module.exports = router;