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
    // Determine folder based on file type and purpose
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
    
    // Set transformation based on file type
    let transformation = [];
    if (file.mimetype.startsWith('image')) {
      transformation = [{ width: 500, height: 500, crop: 'limit' }];
    }
    
    return {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'],
      transformation: transformation,
      resource_type: 'auto' // Automatically detect image or video
    };
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check if file is an image or video
  if (file.fieldname.startsWith('variation_') && file.fieldname.endsWith('_images')) {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for variations'), false);
    }
  } else if (file.fieldname === 'images' || file.fieldname === 'image') {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  } else if (file.fieldname === 'videos') {
    if (file.mimetype.startsWith('video')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  } else if (file.fieldname === 'avatar') {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars'), false);
    }
  } else if (file.fieldname === 'thumbnail') {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for thumbnails'), false);
    }
  } else if (file.fieldname === 'categoryImage') {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for categories'), false);
    }
    
  } else {
    cb(new Error('Invalid file type or field name'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit for all files
    files: 20 // Maximum 20 files per request
  }
});

// Helper function for specific upload scenarios
const createUpload = (fields) => {
  return upload.fields(fields);
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
  
  // Add fields for each variation's images
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
  upload,
  uploadConfigs
};