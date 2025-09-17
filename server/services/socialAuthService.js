const axios = require('axios');
const User = require('../models/User');
const { signToken } = require('../utils/auth');

class SocialAuthService {
  // Google OAuth configuration
  static getGoogleConfig() {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
    };
  }

  // Facebook OAuth configuration
  static getFacebookConfig() {
    return {
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      redirectUri: process.env.FACEBOOK_REDIRECT_URI,
      tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/me'
    };
  }

  // Exchange code for access token (Google)
  static async exchangeGoogleCode(code) {
    const config = this.getGoogleConfig();
    
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);
    params.append('redirect_uri', config.redirectUri);
    params.append('grant_type', 'authorization_code');

    try {
      const response = await axios.post(config.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Google token exchange error:', error.response?.data);
      throw new Error('Failed to exchange Google authorization code');
    }
  }

  // Exchange code for access token (Facebook)
  static async exchangeFacebookCode(code) {
    const config = this.getFacebookConfig();
    
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);
    params.append('redirect_uri', config.redirectUri);

    try {
      const response = await axios.get(`${config.tokenUrl}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Facebook token exchange error:', error.response?.data);
      throw new Error('Failed to exchange Facebook authorization code');
    }
  }

  // Get user info from Google
  static async getGoogleUserInfo(accessToken) {
    const config = this.getGoogleConfig();
    
    try {
      const response = await axios.get(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return {
        id: response.data.sub,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
        emailVerified: response.data.email_verified
      };
    } catch (error) {
      console.error('Google user info error:', error.response?.data);
      throw new Error('Failed to fetch Google user information');
    }
  }

  // Get user info from Facebook
  static async getFacebookUserInfo(accessToken) {
    const config = this.getFacebookConfig();
    
    try {
      const response = await axios.get(`${config.userInfoUrl}?fields=id,name,email,picture.type(large)`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture?.data?.url,
        emailVerified: true // Facebook doesn't provide email verification status
      };
    } catch (error) {
      console.error('Facebook user info error:', error.response?.data);
      throw new Error('Failed to fetch Facebook user information');
    }
  }

  // Find or create user from social auth
  static async findOrCreateUser(provider, userInfo) {
    const socialField = `socialAuth.${provider}.id`;
    
    // Try to find user by social ID
    let user = await User.findOne({ [socialField]: userInfo.id });

    if (user) {
      // Update user info if needed
      user.socialAuth[provider].email = userInfo.email;
      user.socialAuth[provider].name = userInfo.name;
      user.socialAuth[provider].picture = userInfo.picture;
      await user.save();
      return user;
    }

    // Try to find user by email
    if (userInfo.email) {
      user = await User.findOne({ email: userInfo.email.toLowerCase() });
      
      if (user) {
        // Link social auth to existing account
        user.socialAuth[provider] = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        };
        user.authProvider = provider;
        await user.save();
        return user;
      }
    }

    // Create new user
    const newUser = await User.create({
      email: userInfo.email?.toLowerCase(),
      profile: {
        firstName: userInfo.name?.split(' ')[0] || 'User',
        lastName: userInfo.name?.split(' ').slice(1).join(' ') || 'Social',
        avatar: userInfo.picture
      },
      socialAuth: {
        [provider]: {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture
        }
      },
      authProvider: provider,
      isVerified: userInfo.emailVerified || false
    });

    return newUser;
  }

  // Generate redirect URL for social login
  static generateAuthUrl(provider, state = null) {
    const baseUrls = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      facebook: 'https://www.facebook.com/v12.0/dialog/oauth'
    };

    const params = new URLSearchParams();
    
    if (provider === 'google') {
      const config = this.getGoogleConfig();
      params.append('client_id', config.clientId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', 'profile email');
      params.append('access_type', 'offline');
      if (state) params.append('state', state);
      params.append('prompt', 'consent');
    } else if (provider === 'facebook') {
      const config = this.getFacebookConfig();
      params.append('client_id', config.clientId);
      params.append('redirect_uri', config.redirectUri);
      params.append('response_type', 'code');
      params.append('scope', 'email public_profile');
      if (state) params.append('state', state);
    }

    return `${baseUrls[provider]}?${params.toString()}`;
  }
}

module.exports = SocialAuthService;