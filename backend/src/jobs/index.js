const cron = require('node-cron');
const { runMaintenance, retryFailed } = require('./maintenance');

function startJobs() {
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
