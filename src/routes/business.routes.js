const express = require('express');
const {
  createBusiness,
  getBusinesses,
  getBusinessBySlug,
  checkBusinessSlug,
  getMyBusinesses,
  updateBusiness,
  deleteBusiness,
} = require('../controllers/business.controller');
const { protect } = require('../middleware/auth.middleware');
const { businessImageUpload } = require('../middleware/upload.middleware');

const router = express.Router();

// Order matters: static paths before the ":id" / ":slug" dynamic ones.
router.get('/mine', protect, getMyBusinesses);
router.get('/slug-availability', checkBusinessSlug);
router.get('/slug/:slug', getBusinessBySlug);

router
  .route('/')
  .get(getBusinesses)
  .post(protect, businessImageUpload, createBusiness);

router
  .route('/:id')
  .put(protect, businessImageUpload, updateBusiness)
  .delete(protect, deleteBusiness);

module.exports = router;
