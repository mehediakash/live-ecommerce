const Product = require('../models/Product');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

// exports.createProduct = catchAsync(async (req, res, next) => {
//   const {
//     name,
//     description,
//     category,
//     tags,
//     price,
//     originalPrice,
//     costPrice,
//     condition,
//     inventory,
//     variations,
//     shipping,
//     auction,
//     buyItNow,
//     bundle
//   } = req.body;
  
//   // Parse JSON fields
//   const parsedInventory = inventory ? JSON.parse(inventory) : {};
//   const parsedVariations = variations ? JSON.parse(variations) : [];
//   const parsedShipping = shipping ? JSON.parse(shipping) : {};
//   const parsedAuction = auction ? JSON.parse(auction) : {};
//   const parsedBuyItNow = buyItNow ? JSON.parse(buyItNow) : {};
//   const parsedBundle = bundle ? JSON.parse(bundle) : {};
  
//   const productData = {
//     name,
//     description,
//     category,
//     tags: tags ? tags.split(',') : [],
//     seller: req.user.id,
//     price,
//     originalPrice,
//     costPrice,
//     condition,
//     inventory: parsedInventory,
//     variations: parsedVariations,
//     shipping: parsedShipping,
//     auction: parsedAuction,
//     buyItNow: parsedBuyItNow,
//     bundle: parsedBundle
//   };
  
//   // Handle images
//   if (req.files && req.files.images) {
//     productData.images = req.files.images.map(file => ({
//       url: file.path,
//       isPrimary: false
//     }));
    
//     // Set first image as primary
//     if (productData.images.length > 0) {
//       productData.images[0].isPrimary = true;
//     }
//   }
  
//   // Handle videos
//   if (req.files && req.files.videos) {
//     productData.videos = req.files.videos.map(file => ({
//       url: file.path,
//       thumbnail: file.path // In a real app, you'd generate a thumbnail
//     }));
//   }

//   // if (variations && Array.isArray(variations)) {
//   //   productData.variations = variations.map((variation, index) => {
//   //     if (req.files && req.files[`variation_${index}_images`]) {
//   //       variation.images = req.files[`variation_${index}_images`].map(file => ({
//   //         url: file.path,
//   //         isPrimary: false
//   //       }));
//   //       if (variation.images.length > 0) {
//   //         variation.images[0].isPrimary = true;
//   //       }
//   //     }
//   //     return variation;
//   //   });
//   // }

//     // Handle variation images
//   if (parsedVariations.length > 0 && req.files) {
//     productData.variations = parsedVariations.map((variation, index) => {
//       const variationField = `variation_${index}_images`;
//       if (req.files[variationField]) {
//         variation.images = req.files[variationField].map(file => ({
//           url: file.path,
//           isPrimary: false
//         }));
        
//         // Set first image as primary for the variation
//         if (variation.images.length > 0) {
//           variation.images[0].isPrimary = true;
//         }
//       }
//       return variation;
//     });
//   }
  
//   const product = await Product.create(productData);
  
//   res.status(201).json({
//     status: 'success',
//     data: {
//       product
//     }
//   });
// });

const safeParseJSON = (data) => {
  if (!data) return undefined;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } 
    catch { return undefined; }
  }
  return data;
};

exports.createProduct = catchAsync(async (req, res, next) => {
  const {
    name,
    description,
    category,
    tags,
    price,
    originalPrice,
    costPrice,
    condition,
    inventory,
    variations,
    shipping,
    auction,
    buyItNow,
    bundle,
    status
  } = req.body;

  // Safely parse JSON fields
  const parsedInventory = safeParseJSON(inventory);
  const parsedVariations = safeParseJSON(variations);
  const parsedShipping = safeParseJSON(shipping);
  const parsedAuction = safeParseJSON(auction);
  const parsedBuyItNow = safeParseJSON(buyItNow);
  const parsedBundle = safeParseJSON(bundle);

  // Base product data
  const productData = {
    name,
    description,
    category,
    tags: tags ? tags.split(',') : [],
    seller: req.user.id,
    price,
    originalPrice,
    costPrice,
    condition,
    inventory: parsedInventory,
    variations: parsedVariations,
    shipping: parsedShipping,
    auction: parsedAuction,
    buyItNow: parsedBuyItNow,
    bundle: parsedBundle,
    status
  };

  // 🔹 Handle product images
  if (req.files?.images) {
    productData.images = req.files.images.map(file => ({
      url: file.path,
      isPrimary: false
    }));
    if (productData.images.length > 0) productData.images[0].isPrimary = true;
  }

  // 🔹 Handle product videos
  if (req.files?.videos) {
    productData.videos = req.files.videos.map(file => ({
      url: file.path,
      thumbnail: file.path
    }));
  }

  // 🔹 Handle variation images
  if (Array.isArray(parsedVariations) && parsedVariations.length > 0) {
    productData.variations = parsedVariations.map((variation, index) => {
      const imagesField = `variation_${index}_images`;
      const videosField = `variation_${index}_videos`; // optional

      // attach variation images if uploaded
      if (req.files && req.files[imagesField]) {
        variation.images = req.files[imagesField].map((file, idx) => ({
          url: file.path,
          isPrimary: idx === 0
        }));
      }

      // (optional) attach variation videos if uploaded
      if (req.files && req.files[videosField]) {
        variation.videos = req.files[videosField].map(file => ({
          url: file.path,
          thumbnail: file.path
        }));
      }

      return variation;
    });
  }

  // 🔹 Save product
  const product = await Product.create(productData);

  res.status(201).json({
    status: 'success',
    data: { product }
  });
});




exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('seller', 'profile firstName lastName sellerProfile')
    .populate('reviews');
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }
  
  // Increment view count
  product.stats.views += 1;
  await product.save();
  
  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
  const {
    category,
    seller,
    status,
    auction,
    minPrice,
    maxPrice,
    search,
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = req.query;
  
  const filter = {};
  
  if (category) filter.category = category;
  if (seller) filter.seller = seller;
  if (status) filter.status = status;
  if (auction === 'true') filter['auction.isAuction'] = true;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  
  if (search) {
    filter.$text = { $search: search };
  }
  
  const products = await Product.find(filter)
    .populate('seller', 'profile firstName lastName sellerProfile')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Product.countDocuments(filter);
  
  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    }
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ status: 'error', message: 'Product not found' });
  }

  // Check owner
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to update this product'
    });
  }

  // ---------- BASIC FIELDS ----------
  const {
    name,
    description,
    category,
    tags,
    price,
    originalPrice,
    costPrice,
    condition,
    inventory,
    variations,
    shipping,
    auction,
    buyItNow,
    bundle,
    status
  } = req.body;

  const updateData = {};

  if (name) updateData.name = name;
  if (description) updateData.description = description;
  if (category) updateData.category = category;
  if (tags) updateData.tags = tags.split(',');
  if (price) updateData.price = price;
  if (originalPrice) updateData.originalPrice = originalPrice;
  if (costPrice) updateData.costPrice = costPrice;
  if (condition) updateData.condition = condition;
  if (status) updateData.status = status;

  if (inventory) updateData.inventory = JSON.parse(inventory);
  if (shipping) updateData.shipping = JSON.parse(shipping);
  if (auction) updateData.auction = JSON.parse(auction);
  if (buyItNow) updateData.buyItNow = JSON.parse(buyItNow);
  if (bundle) updateData.bundle = JSON.parse(bundle);

  // ---------- PRODUCT LEVEL IMAGES ----------
  if (req.files?.images) {
    const newImages = req.files.images.map(file => ({
      url: file.path,
      isPrimary: false
    }));
    updateData.$push = { ...updateData.$push, images: { $each: newImages } };
  }

  // ---------- PRODUCT LEVEL VIDEOS ----------
  if (req.files?.videos) {
    const newVideos = req.files.videos.map(file => ({
      url: file.path,
      thumbnail: file.path
    }));
    updateData.$push = { ...updateData.$push, videos: { $each: newVideos } };
  }

  // ---------- VARIATIONS ----------
  let parsedVariations = [];
  if (variations) {
    try {
      parsedVariations = JSON.parse(variations);
    } catch (err) {
      parsedVariations = [];
    }
  }

  // Clone existing variations so we can merge
  const mergedVariations = product.variations ? JSON.parse(JSON.stringify(product.variations)) : [];

  // Go through each incoming variation and merge with existing
  if (Array.isArray(parsedVariations)) {
    parsedVariations.forEach((incomingVar, index) => {
      // If this variation already exists, merge
      if (mergedVariations[index]) {
        mergedVariations[index] = {
          ...mergedVariations[index],
          ...incomingVar // merge fields like price, stock etc.
        };
      } else {
        // New variation (doesn't exist yet)
        mergedVariations[index] = incomingVar;
      }

      // Handle uploaded images for this variation
      const imagesField = `variation_${index}_images`;
      if (req.files && req.files[imagesField]) {
        const uploadedImages = req.files[imagesField].map((file, idx) => ({
          url: file.path,
          isPrimary: idx === 0
        }));

        // append rather than overwrite
        mergedVariations[index].images = [
          ...(mergedVariations[index].images || []),
          ...uploadedImages
        ];
      }

      // Handle uploaded videos for this variation
      const videosField = `variation_${index}_videos`;
      if (req.files && req.files[videosField]) {
        const uploadedVideos = req.files[videosField].map(file => ({
          url: file.path,
          thumbnail: file.path
        }));

        mergedVariations[index].videos = [
          ...(mergedVariations[index].videos || []),
          ...uploadedVideos
        ];
      }
    });

    // Finally assign merged variations
    updateData.variations = mergedVariations;
  }

  // ---------- SAVE ----------
  const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: { product: updatedProduct }
  });
});


exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }
  
  // Check if user is the product owner
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to delete this product'
    });
  }
  
  await Product.findByIdAndDelete(req.params.id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.addVariation = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }

  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to add a variation to this product'
    });
  }

  const newVariation = { ...req.body };

  if (req.files && req.files.variation_0_images) {
    newVariation.images = req.files.variation_0_images.map(file => ({
      url: file.path,
      isPrimary: false
    }));
    if (newVariation.images.length > 0) {
      newVariation.images[0].isPrimary = true;
    }
  }

  product.variations.push(newVariation);
  await product.save();

  res.status(201).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.updateVariation = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }

  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to update this product'
    });
  }

  const variation = product.variations.id(req.params.variationId);

  if (!variation) {
    return res.status(404).json({
      status: 'error',
      message: 'Variation not found'
    });
  }

  Object.assign(variation, req.body);

  if (req.files && req.files.images) {
    const newImages = req.files.images.map(file => ({
      url: file.path,
      isPrimary: false
    }));
    variation.images.push(...newImages);
  }

  await product.save();

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.deleteVariation = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);

  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }

  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to delete from this product'
    });
  }

  const variation = product.variations.id(req.params.variationId);

  if (!variation) {
    return res.status(404).json({
      status: 'error',
      message: 'Variation not found'
    });
  }

  variation.remove();
  await product.save();

  res.status(204).json({
    status: 'success',
    data: null
  });
});


exports.startAuction = catchAsync(async (req, res, next) => {
  const { duration } = req.body; // in minutes
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }
  
  // Check if user is the product owner
  if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to start this auction'
    });
  }
  
  if (!product.auction.isAuction) {
    return res.status(400).json({
      status: 'error',
      message: 'Product is not configured for auction'
    });
  }
  
  if (product.auction.status !== 'scheduled') {
    return res.status(400).json({
      status: 'error',
      message: 'Auction can only be started from scheduled status'
    });
  }
  
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  product.auction.status = 'active';
  product.auction.startTime = startTime;
  product.auction.endTime = endTime;
  product.auction.duration = duration;
  
  await product.save();
  
  // Schedule auction end
  setTimeout(() => {
    require('./bidController').finalizeAuction(product._id);
  }, duration * 60000);
  
  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.setPriceAlert = catchAsync(async (req, res, next) => {
  const { productId, targetPrice } = req.body;
  
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      status: 'error',
      message: 'Product not found'
    });
  }
  
  // In a real application, you would store price alerts in a separate collection
  // and have a background job to check for price changes
  
  res.status(200).json({
    status: 'success',
    message: 'Price alert set successfully'
  });
});