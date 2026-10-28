require('express-async-errors');
const config = require('./config');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const ai = require('./lib/ai');
const ocr = require('./lib/ocr');
const { runMaintenance, retryFailed } = require('./jobs/maintenance');
const { startJobs } = require('./jobs');

const app = express();
if (config.isProd) app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, cb) {
      // Non-browser clients send no Origin header. Browsers must be on the allow-list.
      if (!origin || config.clientOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    exposedHeaders: ['Content-Disposition', 'X-Row-Count'],
  })
);
app.use(express.json({ limit: '4mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.', code: 'RATE_LIMITED' },
});
app.use(['/auth/login', '/auth/register', '/consumer/auth'], authLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Tells the UI which integrations are actually live, so it never implies a feature that is off.
app.get('/config', (req, res) =>
  res.json({ ai: ai.isConfigured(), serverOcr: ocr.isConfigured(), email: Boolean(config.resend.apiKey), imageUploads: config.cloudinaryConfigured })
);

const cronAuth = (req, res, next) =>
  config.cronSecret && req.headers.authorization === `Bearer ${config.cronSecret}` ? next() : res.status(401).json({ error: 'Unauthorized' });
app.get('/cron/maintenance', cronAuth, async (req, res) => res.json(await runMaintenance()));
app.get('/cron/notifications', cronAuth, async (req, res) => res.json({ retried: await retryFailed() }));

app.use('/auth', require('./routes/auth'));
app.use('/platform-admin', require('./routes/platformAdmin'));
app.use('/consumer', require('./routes/consumer'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/inventory', require('./routes/inventory'));
app.use('/transfers', require('./routes/transfers'));
app.use('/transfer-requests', require('./routes/transferRequests'));
app.use('/insights', require('./routes/insights'));
app.use('/alerts', require('./routes/alerts'));
app.use('/pharmacies', require('./routes/pharmacies'));
app.use('/pharmacy', require('./routes/pharmacy'));
app.use('/analytics', require('./routes/analytics'));
app.use('/reports', require('./routes/reports'));

app.use((req, res) => res.status(404).json({ error: 'Route not found.', code: 'NOT_FOUND' }));
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`PharmaCycle.AI API listening on :${config.port}`);
    startJobs();
    if (config.runMaintenanceOnBoot) runMaintenance().then((s) => console.log('[job:maintenance]', s)).catch((e) => console.error(e));
  });
}

module.exports = app;
