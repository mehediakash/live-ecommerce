// middleware/optionalUpload.js
module.exports = (uploadMiddleware) => {
  return (req, res, next) => {
    // only run multer if Content-Type is multipart/form-data
    if (req.is('multipart/form-data')) {
      uploadMiddleware(req, res, next);
    } else {
      next();
    }
  };
};
