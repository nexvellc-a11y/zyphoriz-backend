const express = require('express');
const {
  adminLogin,
  getAdminOverview,
  getAdminBusinesses,
  getAdminUsers,
  updateAdminBusiness,
} = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', adminLogin);
router.use(protect, restrictTo('admin'));
router.get('/overview', getAdminOverview);
router.get('/users', getAdminUsers);
router.get('/businesses', getAdminBusinesses);
router.patch('/businesses/:id', updateAdminBusiness);

module.exports = router;
