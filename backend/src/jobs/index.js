const cron = require('node-cron');
const { runMaintenance, retryFailed } = require('./maintenance');

function startJobs() {
  // Vercel runs this app as a function, not as a persistent Node process.
  // Scheduled work is invoked through the protected Vercel Cron routes instead.
  if (process.env.VERCEL === '1') {
    console.log('[jobs] In-process schedules are disabled on Vercel.');
    return;
  }
  const guard = (name, fn) => async () => {
    try {
      console.log(`[job:${name}]`, await fn());
    } catch (e) {
      console.error(`[job:${name}] failed:`, e.message);
    }
  };
  cron.schedule('0 1 * * *', guard('maintenance', runMaintenance), { timezone: 'Africa/Lagos' });
  cron.schedule('*/15 * * * *', guard('notification-retry', retryFailed));
}

module.exports = { startJobs };
