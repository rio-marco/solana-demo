const express = require('express');
const router = express.Router();
const depositController = require('../controllers/deposit.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/address', authMiddleware, depositController.getAddress);
router.post('/address/generate', authMiddleware, depositController.generateAddress);
router.get('/balance', authMiddleware, depositController.getBalance);
router.post('/create', authMiddleware, depositController.createDeposit);
router.post('/verify', authMiddleware, depositController.verifyDeposit);
router.get('/:depositId', authMiddleware, depositController.getDepositById);

module.exports = router;