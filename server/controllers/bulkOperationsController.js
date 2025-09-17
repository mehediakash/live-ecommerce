const Product = require('../models/Product');
const Order = require('../models/Order');
const catchAsync = require('../utils/catchAsync');

exports.bulkUpdateProducts = catchAsync(async (req, res, next) => {
  const { productIds, updates } = req.body;

  if (!productIds || !productIds.length || !updates) {
    return res.status(400).json({
      status: 'error',
      message: 'Product IDs and updates are required'
    });
  }

  // Verify all products belong to the seller
  const products = await Product.find({
    _id: { $in: productIds },
    seller: req.user.id
  });

  if (products.length !== productIds.length) {
    return res.status(403).json({
      status: 'error',
      message: 'Some products do not belong to you'
    });
  }

  const result = await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: updates }
  );

  res.status(200).json({
    status: 'success',
    message: `Updated ${result.modifiedCount} products`,
    data: {
      modifiedCount: result.modifiedCount
    }
  });
});

exports.bulkUpdateInventory = catchAsync(async (req, res, next) => {
  const { inventoryUpdates } = req.body;

  if (!inventoryUpdates || !inventoryUpdates.length) {
    return res.status(400).json({
      status: 'error',
      message: 'Inventory updates are required'
    });
  }

  const productIds = inventoryUpdates.map(update => update.productId);
  
  // Verify all products belong to the seller
  const products = await Product.find({
    _id: { $in: productIds },
    seller: req.user.id
  });

  if (products.length !== productIds.length) {
    return res.status(403).json({
      status: 'error',
      message: 'Some products do not belong to you'
    });
  }

  const bulkOperations = inventoryUpdates.map(update => ({
    updateOne: {
      filter: { _id: update.productId },
      update: {
        $set: {
          'inventory.totalQuantity': update.totalQuantity,
          'inventory.lowStockThreshold': update.lowStockThreshold || 5
        }
      }
    }
  }));

  const result = await Product.bulkWrite(bulkOperations);

  res.status(200).json({
    status: 'success',
    message: `Updated inventory for ${result.modifiedCount} products`,
    data: {
      modifiedCount: result.modifiedCount
    }
  });
});

exports.bulkUpdateOrderStatus = catchAsync(async (req, res, next) => {
  const { orderIds, status, trackingNumber, carrier } = req.body;

  if (!orderIds || !orderIds.length || !status) {
    return res.status(400).json({
      status: 'error',
      message: 'Order IDs and status are required'
    });
  }

  // Verify all orders belong to the seller
  const orders = await Order.find({
    _id: { $in: orderIds },
    seller: req.user.id
  });

  if (orders.length !== orderIds.length) {
    return res.status(403).json({
      status: 'error',
      message: 'Some orders do not belong to you'
    });
  }

  const updateData = { status };
  if (trackingNumber) {
    updateData['fulfillment.trackingNumber'] = trackingNumber;
    updateData['fulfillment.carrier'] = carrier;
    updateData['fulfillment.shippedAt'] = new Date();
  }

  const result = await Order.updateMany(
    { _id: { $in: orderIds } },
    { $set: updateData }
  );

  res.status(200).json({
    status: 'success',
    message: `Updated ${result.modifiedCount} orders`,
    data: {
      modifiedCount: result.modifiedCount
    }
  });
});

exports.bulkCreateProducts = catchAsync(async (req, res, next) => {
  const { products } = req.body;

  if (!products || !products.length) {
    return res.status(400).json({
      status: 'error',
      message: 'Products data is required'
    });
  }

  // Add seller ID to each product
  const productsWithSeller = products.map(product => ({
    ...product,
    seller: req.user.id,
    status: 'draft'
  }));

  const createdProducts = await Product.insertMany(productsWithSeller);

  res.status(201).json({
    status: 'success',
    message: `Created ${createdProducts.length} products`,
    data: {
      products: createdProducts
    }
  });
});

exports.exportProductCatalog = catchAsync(async (req, res, next) => {
  const { format = 'json' } = req.query;

  const products = await Product.find({ seller: req.user.id })
    .select('name description price category inventory variations images')
    .lean();

  if (format === 'csv') {
    // Convert to CSV format
    const csvData = products.map(product => ({
      Name: product.name,
      Description: product.description,
      Price: product.price,
      Category: product.category,
      Stock: product.inventory.totalQuantity,
      SKU: product.variations?.[0]?.sku || ''
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=product-catalog.csv');
    
    // Simple CSV conversion
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    return res.send(csv);
  }

  res.status(200).json({
    status: 'success',
    data: {
      products,
      total: products.length
    }
  });
});