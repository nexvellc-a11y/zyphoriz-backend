const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fileFilter = (req, file, cb) => {
  const isValid = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
  if (isValid) return cb(null, true);
  cb(new ApiError(400, 'Only JPG, PNG, and WEBP images are allowed'));
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB, matches frontend copy
});

// Accepts a single "banner" file + up to 6 "gallery" files in one request
const parseBusinessImages = upload.fields([
  { name: 'banner', maxCount: 1 },
  { name: 'gallery', maxCount: 6 },
]);

const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const folder = file.fieldname === 'banner' ? 'zyphoriz/businesses/banners' : 'zyphoriz/businesses/gallery';
  const stream = cloudinary.uploader.upload_stream(
    { folder, resource_type: 'image' },
    (error, result) => (error ? reject(error) : resolve(result))
  );
  stream.end(file.buffer);
});

const businessImageUpload = (req, res, next) => {
  parseBusinessImages(req, res, async (error) => {
    if (error) return next(error);

    try {
      const files = Object.values(req.files || {}).flat();
      const uploaded = await Promise.all(files.map(uploadToCloudinary));
      let index = 0;

      Object.keys(req.files || {}).forEach((field) => {
        req.files[field] = req.files[field].map(() => ({
          url: uploaded[index].secure_url,
          publicId: uploaded[index++].public_id,
        }));
      });

      next();
    } catch (uploadError) {
  console.error('❌ Cloudinary upload error:', uploadError);

  next(
    new ApiError(
      502,
      `Image upload failed: ${uploadError?.message || 'Unknown Cloudinary error'}`
    )
  );
}
  });
};

module.exports = { businessImageUpload };
