const Category = require('../models/Category');
const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');

exports.createCategory = catchAsync(async (req, res, next) => {
  const { name, description, parentCategory, sortOrder } = req.body;
  


    let metadata = {};
  if (req.body.metadata) {
    try {
      metadata = typeof req.body.metadata === 'string' 
        ? JSON.parse(req.body.metadata) 
        : req.body.metadata;
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid metadata format, must be JSON object'
      });
    }
  }

  if (!req.files || !req.files['categoryImage'] || req.files['categoryImage'].length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Category image is required'
    });
  }

  const categoryData = {
    name,
    description,
    parentCategory,
    sortOrder,
    metadata,
    createdBy: req.user.id,
    image: req.files['categoryImage'][0].path
  };

  
  // If user is admin, auto-approve
  if (req.user.role === 'admin') {
    categoryData.status = 'approved';
    categoryData.isActive = true;
  }
  
  const category = await Category.create(categoryData);
  
  res.status(201).json({
    status: 'success',
    data: {
      category
    }
  });
});

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const { status, activeOnly, includeProducts } = req.query;
  
  const filter = {};
  if (status) filter.status = status;
  if (activeOnly === 'true') filter.isActive = true;
  
  let query = Category.find(filter)
    .populate('createdBy', 'profile firstName lastName')
    .populate('parentCategory', 'name')
    .sort({ sortOrder: 1, name: 1 });
  
  if (includeProducts === 'true') {
    query = query.populate({
      path: 'productCount',
      select: 'name price images'
    });
  }
  
  const categories = await query;
  
  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories
    }
  });
});

exports.getCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { includeProducts } = req.query;
  
  let query = Category.findById(id)
    .populate('createdBy', 'profile firstName lastName')
    .populate('parentCategory', 'name')
    .populate('subcategories', 'name description image');
  
  if (includeProducts === 'true') {
    query = query.populate({
      path: 'products',
      select: 'name price images condition stats',
      options: { limit: 50 }
    });
  }
  
  const category = await query;
  
  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, parentCategory, sortOrder, status, isActive } = req.body;

  // Parse metadata safely
  let metadata;
  if (req.body.metadata) {
    try {
      metadata = typeof req.body.metadata === 'string'
        ? JSON.parse(req.body.metadata)
        : req.body.metadata;
    } catch (err) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid metadata format, must be JSON object'
      });
    }
  }

  const category = await Category.findById(id);
  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }

  const updateData = { name, description, parentCategory, sortOrder };
  if (metadata) updateData.metadata = metadata;

  // Only admin can change status/isActive
  if (req.user.role === 'admin') {
    if (status) updateData.status = status;
    if (typeof isActive !== 'undefined') updateData.isActive = isActive;
  }

  // Update image if a new file is uploaded
  if (req.files && req.files['categoryImage'] && req.files['categoryImage'][0]) {
    updateData.image = req.files['categoryImage'][0].path;
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      category: updatedCategory
    }
  });
});


exports.deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const category = await Category.findById(id);
  
  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }
  
  // Check if category has products
  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete category with products. Move products first.'
    });
  }
  
  await Category.findByIdAndDelete(id);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getCategoryProducts = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { page = 1, limit = 20, sort = '-createdAt' } = req.query;
  
  const products = await Product.find({ category: id, status: 'active' })
    .populate('seller', 'profile firstName lastName')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await Product.countDocuments({ category: id, status: 'active' });
  
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

exports.approveCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const category = await Category.findByIdAndUpdate(
    id,
    { status: 'approved', isActive: true },
    { new: true }
  );
  
  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

exports.rejectCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const category = await Category.findByIdAndUpdate(
    id,
    { status: 'rejected', isActive: false, metadata: { rejectionReason: reason } },
    { new: true }
  );
  
  if (!category) {
    return res.status(404).json({
      status: 'error',
      message: 'Category not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});