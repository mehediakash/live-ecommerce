const User = require('../models/User');
const SocialAuthService = require('../services/socialAuthService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');
const catchAsync = require('../utils/catchAsync');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  

  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = async (req, res,next) => {
  try {
    const { email, password, passwordConfirm, firstName, lastName, phone, role } = req.body;

    if (password !== passwordConfirm) {
      return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: 'User already exists with this email' });
    }

    const newUser = await User.create({
      email,
      password,
      phone,
      profile: { firstName, lastName },
      role: role || 'user'
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    newUser.verificationToken = verificationToken;
    await newUser.save({ validateBeforeSave: false });

    const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;
    const message = `Please verify your email by clicking on this link: ${verificationUrl}`;

    await sendEmail({
      email: newUser.email,
      subject: 'Verify your email (valid for 24 hours)',
      message
    });

    createSendToken(newUser, 201, res);

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ status: 'error', message: 'There was an error sending the email. Try again later.' });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }
    
    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }
    
    // 3) Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        status: 'error',
        message: 'Please verify your email first'
      });
    }
    
    // 4) If everything ok, send token to client
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({ verificationToken: token });
    
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }
    
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'There is no user with that email address'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    await user.save({ validateBeforeSave: false });
    
    // Send email with reset token
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
    
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: ${resetUrl}`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Your password reset token (valid for 10 minutes)',
        message
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Token sent to email'
      });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        status: 'error',
        message: 'There was an error sending the email. Try again later.'
      });
    }
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, passwordConfirm } = req.body;
    
    if (password !== passwordConfirm) {
      return res.status(400).json({
        status: 'error',
        message: 'Passwords do not match'
      });
    }
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }
    
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in. Please log in to get access.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.'
      });
    }
    
    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, newPasswordConfirm } = req.body;
    
    if (newPassword !== newPasswordConfirm) {
      return res.status(400).json({
        status: 'error',
        message: 'Passwords do not match'
      });
    }
    
    const user = await User.findById(req.user.id).select('+password');
    
    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Your current password is wrong'
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    createSendToken(user, 200, res);
  } catch (err) {
    res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
};

// Google authentication
exports.googleAuth = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      status: 'error',
      message: 'Authorization code is required'
    });
  }

  try {
    // Exchange code for tokens
    const tokens = await SocialAuthService.exchangeGoogleCode(code);
    
    // Get user info
    const userInfo = await SocialAuthService.getGoogleUserInfo(tokens.access_token);
    
    // Find or create user
    const user = await SocialAuthService.findOrCreateUser('google', userInfo);
    
    // Generate JWT token
    const token = signToken(user._id);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Facebook authentication
exports.facebookAuth = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      status: 'error',
      message: 'Authorization code is required'
    });
  }

  try {
    // Exchange code for tokens
    const tokens = await SocialAuthService.exchangeFacebookCode(code);
    
    // Get user info
    const userInfo = await SocialAuthService.getFacebookUserInfo(tokens.access_token);
    
    // Find or create user
    const user = await SocialAuthService.findOrCreateUser('facebook', userInfo);
    
    // Generate JWT token
    const token = signToken(user._id);
    
    // Remove password from output
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Facebook authentication error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get social auth URLs
exports.getSocialAuthUrls = catchAsync(async (req, res, next) => {
  const { redirect } = req.query;
  
  const googleUrl = SocialAuthService.generateAuthUrl('google', redirect);
  const facebookUrl = SocialAuthService.generateAuthUrl('facebook', redirect);
  
  res.status(200).json({
    status: 'success',
    data: {
      google: googleUrl,
      facebook: facebookUrl
    }
  });
});

// Link social account to existing user
exports.linkSocialAccount = catchAsync(async (req, res, next) => {
  const { provider, code } = req.body;

  if (!['google', 'facebook'].includes(provider)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid provider'
    });
  }

  try {
    let userInfo;
    if (provider === 'google') {
      const tokens = await SocialAuthService.exchangeGoogleCode(code);
      userInfo = await SocialAuthService.getGoogleUserInfo(tokens.access_token);
    } else {
      const tokens = await SocialAuthService.exchangeFacebookCode(code);
      userInfo = await SocialAuthService.getFacebookUserInfo(tokens.access_token);
    }

    // Check if social account is already linked to another user
    const socialField = `socialAuth.${provider}.id`;
    const existingUser = await User.findOne({ [socialField]: userInfo.id });
    
    if (existingUser && existingUser._id.toString() !== req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'This social account is already linked to another user'
      });
    }

    // Update current user with social auth info
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          [`socialAuth.${provider}`]: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          },
          authProvider: provider
        }
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Social account linked successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Link social account error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Unlink social account
exports.unlinkSocialAccount = catchAsync(async (req, res, next) => {
  const { provider } = req.body;

  if (!['google', 'facebook'].includes(provider)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid provider'
    });
  }

  // Check if user has local authentication as fallback
  const user = await User.findById(req.user.id).select('+password');
  
  if (!user.email || !user.password) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot unlink social account. Please set up email and password first.'
    });
  }

  // Unlink social account
  await User.findByIdAndUpdate(
    req.user.id,
    {
      $unset: {
        [`socialAuth.${provider}`]: 1
      },
      $set: {
        authProvider: 'local'
      }
    }
  );

  res.status(200).json({
    status: 'success',
    message: 'Social account unlinked successfully'
  });
});