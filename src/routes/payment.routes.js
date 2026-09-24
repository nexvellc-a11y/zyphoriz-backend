const express = require('express');
const { createOrder, checkout, webhook, getMyPayments } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/order', protect, createOrder);
router.post('/checkout', protect, checkout);
router.post('/webhook', webhook);
router.get('/mine', protect, getMyPayments);

module.exports = router;
