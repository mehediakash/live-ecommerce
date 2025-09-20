const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    let folder = 'livestream-ecommerce';

    if (file.fieldname.startsWith('variation_') && file.fieldname.endsWith('_images')) {
      folder = 'livestream-ecommerce/variations';
    } else if (file.fieldname.startsWith('variation_') && file.fieldname.endsWith('_videos')) {
      folder = 'livestream-ecommerce/variations';
    } else if (file.fieldname === 'images' || file.fieldname === 'image') {
      folder = 'livestream-ecommerce/products';
    } else if (file.fieldname === 'videos') {
      folder = 'livestream-ecommerce/videos';
    } else if (file.fieldname === 'avatar') {
      folder = 'livestream-ecommerce/avatars';
    } else if (file.fieldname === 'thumbnail') {
      folder = 'livestream-ecommerce/thumbnails';
    } else if (file.fieldname === 'categoryImage') {
      folder = 'livestream-ecommerce/categories';
    }

    // Image transformations
    const transformation = file.mimetype.startsWith('image') ? [{ width: 500, height: 500, crop: 'limit' }] : [];

    return {
      folder,
      resource_type: 'auto',
      transformation
    };
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const imageOnlyFields = ['avatar', 'thumbnail', 'categoryImage'];
  const variationImage = file.fieldname.startsWith('variation_') && file.fieldname.endsWith('_images');
  const variationVideo = file.fieldname.startsWith('variation_') && file.fieldname.endsWith('_videos');

  if (variationImage || file.fieldname === 'images' || file.fieldname === 'image') {
    return file.mimetype.startsWith('image') ? cb(null, true) : cb(new Error('Only image files are allowed'), false);
  } else if (variationVideo || file.fieldname === 'videos') {
    return file.mimetype.startsWith('video') ? cb(null, true) : cb(new Error('Only video files are allowed'), false);
  } else if (imageOnlyFields.includes(file.fieldname)) {
    return file.mimetype.startsWith('image') ? cb(null, true) : cb(new Error(`Only image files are allowed for ${file.fieldname}`), false);
  } else {
    return cb(new Error('Invalid file type or field name'), false);
  }
};

// Multer upload setup (same)
const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024, files: 50 }
});

// Helper to wrap multer.fields and fix paths
const createUpload = (fields) => {
  const uploader = multerUpload.fields(fields);
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) return next(err);

      if (req.files) {
        for (const key in req.files) {
          if (Array.isArray(req.files[key])) {
            req.files[key].forEach(file => {
              if (!file.path) {
                file.path = file.secure_url || file.filename || '';
              }
            });
          }
        }
      }
      next();
    });
  };
};

// Pre-configured upload setups
const uploadConfigs = {
  product: (() => {
    // Register up to 20 variations fields
    const fields = [
      { name: 'images', maxCount: 10 },
      { name: 'videos', maxCount: 5 }
    ];
    for (let i = 0; i < 20; i++) {
      fields.push({ name: `variation_${i}_images`, maxCount: 5 });
      fields.push({ name: `variation_${i}_videos`, maxCount: 3 });
    }
    return createUpload(fields);
  })(),

  variation: createUpload([{ name: 'images', maxCount: 5 }]),
  user: createUpload([{ name: 'avatar', maxCount: 1 }]),
  stream: createUpload([{ name: 'thumbnail', maxCount: 1 }]),
  category: createUpload([{ name: 'categoryImage', maxCount: 1 }]),
  training: createUpload([{ name: 'thumbnail', maxCount: 1 }])
};

module.exports = {
  upload: multerUpload,
  uploadConfigs
};