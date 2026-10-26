const prisma = require('../lib/prisma');
const { computeStatus, daysToExpiry, isoDate } = require('../utils/status');
const { emailPharmacyAdmins, retryFailed } = require('../lib/notifications');
const { safely } = require('../lib/alerts');

const BATCH = 500;

// Recomputes every item's status and creates DEDUPED alerts that respect each pharmacy's preferences.
async function runMaintenance(now = new Date()) {
  const summary = { checked: 0, statusChanged: 0, alertsCreated: 0 };
  const prefs = new Map((await prisma.pharmacy.findMany({ select: { id: true, alertNearExpiry: true, alertLowStock: true } })).map((p) => [p.id, p]));
  const created = new Map();
  let cursor;

  for (;;) {
    const items = await prisma.inventoryItem.findMany({
      where: { deletedAt: null }, orderBy: { id: 'asc' }, take: BATCH, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { medicine: { select: { name: true, strength: true } } },
    });
    if (!items.length) break;
    cursor = items[items.length - 1].id;
    const byPharmacy = new Map();

    for (const it of items) {
      summary.checked += 1;
      const status = computeStatus(it, now);
      if (status !== it.status) {
        await prisma.inventoryItem.update({ where: { id: it.id }, data: { status } });
        summary.statusChanged += 1;
      }
      const p = prefs.get(it.pharmacyId);
      if (!p) continue;
      const label = `${it.medicine.name} ${it.medicine.strength} (batch ${it.batchNumber})`;
      const days = daysToExpiry(it.expiryDate, now);
      const base = { pharmacyId: it.pharmacyId, link: '/inventory' };
      let alert = null;
      if (status === 'NEAR_EXPIRY' && p.alertNearExpiry) alert = { ...base, type: 'NEAR_EXPIRY', severity: days <= 7 ? 'URGENT' : 'WARNING', message: `${label} expires in ${days} day(s) (${isoDate(it.expiryDate)}).`, dedupeKey: `NEAR_EXPIRY:${it.id}:${isoDate(it.expiryDate)}` };
      else if (status === 'EXPIRED' && p.alertNearExpiry) alert = { ...base, type: 'EXPIRED', severity: 'URGENT', message: `${label} expired on ${isoDate(it.expiryDate)}. Remove it from sale.`, dedupeKey: `EXPIRED:${it.id}` };
      else if (status === 'LOW_STOCK' && p.alertLowStock) alert = { ...base, type: 'LOW_STOCK', severity: 'WARNING', message: `${label} is running low (${it.quantity} left).`, dedupeKey: `LOW_STOCK:${it.id}:${it.quantity}` };
      else if (status === 'OUT_OF_STOCK' && p.alertLowStock) alert = { ...base, type: 'OUT_OF_STOCK', severity: 'URGENT', message: `${label} is out of stock.`, dedupeKey: `OUT_OF_STOCK:${it.id}` };
      if (alert) (byPharmacy.get(it.pharmacyId) || byPharmacy.set(it.pharmacyId, []).get(it.pharmacyId)).push(alert);
    }

    for (const [pharmacyId, data] of byPharmacy) {
      const r = await prisma.alert.createMany({ data, skipDuplicates: true });
      summary.alertsCreated += r.count;
      created.set(pharmacyId, (created.get(pharmacyId) || 0) + r.count);
    }
    if (items.length < BATCH) break;
  }

  for (const [pharmacyId, n] of created) {
    if (!n) continue;
    await safely('stock-email', () =>
      emailPharmacyAdmins(pharmacyId, 'emailStock', { subject: `PharmaCycle.AI: ${n} new stock alert(s)`, text: `You have ${n} new expiry or stock alert(s). Log in to review them.` })
    );
  }
  return summary;
}

module.exports = { runMaintenance, retryFailed };
