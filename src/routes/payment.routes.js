const express = require('express');
const { getPaymentPrice, createOrder, checkout, getMyPayments } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/price', getPaymentPrice);
router.post('/order', protect, createOrder);
router.post('/checkout', protect, checkout);
router.get('/mine', protect, getMyPayments);

module.exports = router;
