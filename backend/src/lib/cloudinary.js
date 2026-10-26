const { v2: cloudinary } = require('cloudinary');
const config = require('../config');
const HttpError = require('../utils/httpError');

// The SDK reads CLOUDINARY_URL from the environment automatically.
function uploadImage(buffer, folder) {
  if (!config.cloudinaryConfigured) throw new HttpError(503, 'Image uploads are not configured (CLOUDINARY_URL missing).', 'IMAGES_NOT_CONFIGURED');
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: `pharmacycle/${folder}`, resource_type: 'image' }, (err, result) => (err ? reject(err) : resolve(result.secure_url)))
      .end(buffer);
  });
}

module.exports = { uploadImage };
