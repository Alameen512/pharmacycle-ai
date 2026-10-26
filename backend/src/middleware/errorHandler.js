const { ZodError } = require('zod');
const HttpError = require('../utils/httpError');
const config = require('../config');

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      (fields[key] = fields[key] || []).push(issue.message);
    }
    return res.status(400).json({ error: 'Please correct the highlighted fields.', code: 'VALIDATION_ERROR', fields });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code, details: err.details });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body.', code: 'BAD_JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.', code: 'TOO_LARGE' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large (max 4 MB).', code: 'TOO_LARGE' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'A record with these details already exists.', code: 'DUPLICATE' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found.', code: 'NOT_FOUND' });

  console.error('[error]', err);
  res.status(500).json({ error: config.isProd ? 'Something went wrong on our side.' : err.message, code: 'INTERNAL' });
};
