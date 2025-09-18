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

    let transformation = [];
    if (file.mimetype.startsWith('image')) {
      transformation = [{ width: 500, height: 500, crop: 'limit' }];
    }

    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
      transformation,
      resource_type: 'auto'
    };
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const imageOnly = ['avatar', 'thumbnail', 'categoryImage'];
  const variationImage = file.fieldname.startsWith('variation_') && file.fieldname.endsWith('_images');

  if (variationImage || file.fieldname === 'images' || file.fieldname === 'image') {
    return file.mimetype.startsWith('image') ? cb(null, true) : cb(new Error('Only image files are allowed'), false);
  } else if (file.fieldname === 'videos') {
    return file.mimetype.startsWith('video') ? cb(null, true) : cb(new Error('Only video files are allowed'), false);
  } else if (imageOnly.includes(file.fieldname)) {
    return file.mimetype.startsWith('image') ? cb(null, true) : cb(new Error(`Only image files are allowed for ${file.fieldname}`), false);
  } else {
    return cb(new Error('Invalid file type or field name'), false);
  }
};

// Multer upload setup
const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 20
  }
});

// Helper function to fix Cloudinary path and wrap multer.fields
const createUpload = (fields) => {
  const uploader = multerUpload.fields(fields);
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) return next(err);

      // Fix file.path for all uploaded files
      if (req.files) {
        for (const key in req.files) {
          req.files[key].forEach((file) => {
            if (!file.path) {
              file.path = file.secure_url || file.filename; // Ensure controller can use file.path
            }
          });
        }
      }
      next();
    });
  };
};

// Pre-configured upload setups for different use cases
const uploadConfigs = {
  product: createUpload([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 5 }
  ]),

  productWithVariations: (variationCount = 0) => {
    const fields = [
      { name: 'images', maxCount: 10 },
      { name: 'videos', maxCount: 5 }
    ];
    for (let i = 0; i < variationCount; i++) {
      fields.push({ name: `variation_${i}_images`, maxCount: 5 });
    }
    return createUpload(fields);
  },

  variation: createUpload([
    { name: 'images', maxCount: 5 }
  ]),

  user: createUpload([
    { name: 'avatar', maxCount: 1 }
  ]),

  stream: createUpload([
    { name: 'thumbnail', maxCount: 1 }
  ]),

  category: createUpload([
    { name: 'categoryImage', maxCount: 1 }
  ]),

  training: createUpload([
    { name: 'thumbnail', maxCount: 1 }
  ])
};

module.exports = {
  upload: multerUpload,
  uploadConfigs
};
