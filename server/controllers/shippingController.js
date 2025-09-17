const ShippingProfile = require('../models/ShippingProfile');
const Product = require('../models/Product');
const catchAsync = require('../utils/catchAsync');

exports.createShippingProfile = catchAsync(async (req, res, next) => {
  const {
    name,
    processingTime,
    shippingOptions,
    packaging,
    insurance,
    returnPolicy,
    internationalSettings,
    isDefault
  } = req.body;

  // If setting as default, remove default from other profiles
  if (isDefault) {
    await ShippingProfile.updateMany(
      { seller: req.user.id },
      { isDefault: false }
    );
  }

  const shippingProfile = await ShippingProfile.create({
    name,
    processingTime,
    shippingOptions,
    packaging,
    insurance,
    returnPolicy,
    internationalSettings,
    isDefault,
    seller: req.user.id
  });

  res.status(201).json({
    status: 'success',
    data: {
      shippingProfile
    }
  });
});

exports.getShippingProfiles = catchAsync(async (req, res, next) => {
  const shippingProfiles = await ShippingProfile.find({ seller: req.user.id });

  res.status(200).json({
    status: 'success',
    results: shippingProfiles.length,
    data: {
      shippingProfiles
    }
  });
});

exports.getShippingProfile = catchAsync(async (req, res, next) => {
  const shippingProfile = await ShippingProfile.findOne({
    _id: req.params.id,
    seller: req.user.id
  });

  if (!shippingProfile) {
    return res.status(404).json({
      status: 'error',
      message: 'Shipping profile not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      shippingProfile
    }
  });
});

exports.updateShippingProfile = catchAsync(async (req, res, next) => {
  const {
    name,
    processingTime,
    shippingOptions,
    packaging,
    insurance,
    returnPolicy,
    internationalSettings,
    isDefault
  } = req.body;

  // If setting as default, remove default from other profiles
  if (isDefault) {
    await ShippingProfile.updateMany(
      { seller: req.user.id, _id: { $ne: req.params.id } },
      { isDefault: false }
    );
  }

  const shippingProfile = await ShippingProfile.findOneAndUpdate(
    { _id: req.params.id, seller: req.user.id },
    {
      name,
      processingTime,
      shippingOptions,
      packaging,
      insurance,
      returnPolicy,
      internationalSettings,
      isDefault
    },
    { new: true, runValidators: true }
  );

  if (!shippingProfile) {
    return res.status(404).json({
      status: 'error',
      message: 'Shipping profile not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      shippingProfile
    }
  });
});

exports.deleteShippingProfile = catchAsync(async (req, res, next) => {
  const shippingProfile = await ShippingProfile.findOneAndDelete({
    _id: req.params.id,
    seller: req.user.id
  });

  if (!shippingProfile) {
    return res.status(404).json({
      status: 'error',
      message: 'Shipping profile not found'
    });
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.calculateShipping = catchAsync(async (req, res, next) => {
  const { items, destinationCountry, totalValue } = req.body;

  // Get all shipping profiles for the seller
  const shippingProfiles = await ShippingProfile.find({ seller: req.user.id });
  
  const shippingOptions = [];

  for (const profile of shippingProfiles) {
    for (const option of profile.shippingOptions) {
      // Check if option is available for destination
      if (option.countries && option.countries.length > 0 && 
          !option.countries.includes(destinationCountry)) {
        continue;
      }

      // Check if international shipping is required
      if (destinationCountry !== 'GB' && option.type !== 'international') {
        continue;
      }

      let cost = option.cost;

      // Apply free shipping threshold
      if (option.freeShippingThreshold && totalValue >= option.freeShippingThreshold) {
        cost = 0;
      }

      // Add insurance cost if applicable
      if (profile.insurance.isAvailable && totalValue > 0) {
        const insuranceCost = (totalValue * profile.insurance.coverage) / 100;
        cost += insuranceCost;
      }

      shippingOptions.push({
        profileId: profile._id,
        optionId: option._id,
        name: option.name,
        type: option.type,
        carrier: option.carrier,
        cost: parseFloat(cost.toFixed(2)),
        estimatedDelivery: option.estimatedDelivery,
        insurance: profile.insurance.isAvailable
      });
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      shippingOptions
    }
  });
});

exports.generateShippingLabel = catchAsync(async (req, res, next) => {
  const { orderId, profileId, optionId } = req.body;

  // This would integrate with actual carrier API
  // For now, we'll simulate label generation

  const labelData = {
    labelId: `LABEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    trackingNumber: `TRK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    downloadUrl: `https://api.yourplatform.com/labels/${orderId}.pdf`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };

  res.status(200).json({
    status: 'success',
    data: {
      label: labelData
    }
  });
});