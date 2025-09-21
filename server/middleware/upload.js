const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage setup
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

    const transformation = file.mimetype.startsWith('image')
      ? [{ width: 500, height: 500, crop: 'limit' }]
      : [];

    return {
      folder,
      resource_type: 'auto',
      transformation
    };
  }
});

// File filter to allow only valid types
const fileFilter = (req, file, cb) => {
  const imageOnlyFields = ['avatar', 'thumbnail', 'categoryImage'];

  const isVariationImage = file.fieldname.startsWith('variation_') && file.fieldname.endsWith('_images');
  const isVariationVideo = file.fieldname.startsWith('variation_') && file.fieldname.endsWith('_videos');

  // Image fields
  if (isVariationImage || file.fieldname === 'images' || file.fieldname === 'image' || imageOnlyFields.includes(file.fieldname)) {
    if (file.mimetype.startsWith('image')) return cb(null, true);
    return cb(new Error(`Only image files are allowed for ${file.fieldname}`), false);
  }

  // Video fields
  if (isVariationVideo || file.fieldname === 'videos') {
    // Sometimes browsers send wrong MIME for MP4; accept mp4 extension too
    if (file.mimetype.startsWith('video') || file.originalname.match(/\.(mp4|mov|avi|mkv)$/i)) {
      return cb(null, true);
    }
    return cb(new Error(`Only video files are allowed for ${file.fieldname}`), false);
  }

  return cb(new Error(`Invalid file field: ${file.fieldname}`), false);
};

// Multer setup
const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 50 }
});

// Helper to create multi-field upload
const createUpload = (fields) => {
  const uploader = multerUpload.fields(fields);
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) return next(err);

      // Ensure all files have a valid path
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

// Upload configurations
const uploadConfigs = {
  product: (() => {
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

  variation: createUpload([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 3 }
  ]),

  user: createUpload([{ name: 'avatar', maxCount: 1 }]),
  stream: createUpload([{ name: 'thumbnail', maxCount: 1 }]),
  
  category: createUpload([{ name: 'categoryImage', maxCount: 1 }]),
  training: createUpload([{ name: 'thumbnail', maxCount: 1 }])
};

module.exports = {
  upload: multerUpload,
  uploadConfigs
};
