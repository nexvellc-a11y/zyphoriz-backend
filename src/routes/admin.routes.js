const express = require('express');
const {
  adminLogin,
  getAdminBusinesses,
  getAdminUsers,
  updateAdminBusiness,
} = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', adminLogin);
router.use(protect, restrictTo('admin'));
router.get('/users', getAdminUsers);
router.get('/businesses', getAdminBusinesses);
router.patch('/businesses/:id', updateAdminBusiness);

module.exports = router;
