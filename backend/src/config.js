require('dotenv').config();

const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[config] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('[config] JWT_SECRET must be at least 32 characters.');
  process.exit(1);
}

const list = (v, d = '') =>
  (v || d)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigins: list(process.env.CLIENT_URL, 'http://localhost:3000'),
  cronSecret: process.env.CRON_SECRET || '',
  runMaintenanceOnBoot: process.env.RUN_MAINTENANCE_ON_BOOT === 'true',
  groq: { apiKey: process.env.GROQ_API_KEY || '', model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b' },
  gemini: { apiKey: process.env.GEMINI_API_KEY || '', model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' },
  resend: { apiKey: process.env.RESEND_API_KEY || '', from: process.env.EMAIL_FROM || 'PharmaCycle.AI <onboarding@resend.dev>' },
  cloudinaryConfigured: Boolean(process.env.CLOUDINARY_URL),
};
