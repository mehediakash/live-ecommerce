// middleware/fixCloudinaryPath.js
const fixCloudinaryPath = (req, res, next) => {
  if (req.file && !req.file.path) {
    // CloudinaryStorage may store URL in `req.file.filename` or `req.file.secure_url`
    req.file.path = req.file.secure_url || req.file.filename;
  }
  next();
};

module.exports = fixCloudinaryPath;
