const express = require('express');
const { getPaymentPrice, createOrder, checkout, getMyPayments, getAllPayments } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/price', getPaymentPrice);
router.post('/order', protect, createOrder);
router.post('/checkout', protect, checkout);
router.get('/mine', protect, getMyPayments);
router.get('/all', protect, getAllPayments);


module.exports = router;
