const prisma = require('./prisma');

const PREF_BY_TYPE = {
  TRANSFER_REQUEST: 'alertTransfer',
  TRANSFER_UPDATE: 'alertTransfer',
  DELIVERY_REQUEST: 'alertDelivery',
  NEAR_EXPIRY: 'alertNearExpiry',
  EXPIRED: 'alertNearExpiry',
  LOW_STOCK: 'alertLowStock',
  OUT_OF_STOCK: 'alertLowStock',
};

// Creates an alert unless the pharmacy turned that category off or the dedupeKey already exists.
async function pushAlert({ pharmacyId, type, severity = 'INFO', message, link, dedupeKey }) {
  const pref = PREF_BY_TYPE[type];
  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId }, select: { [pref]: true } });
  if (!pharmacy || !pharmacy[pref]) return null;
  try {
    return await prisma.alert.create({ data: { pharmacyId, type, severity, message, link, dedupeKey } });
  } catch (e) {
    if (e.code === 'P2002') return null;
    throw e;
  }
}

// Side effects (alerts, email) must never roll back or fail a committed transfer.
async function safely(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.error(`[side-effect:${label}]`, e.message);
  }
}

module.exports = { pushAlert, safely };
