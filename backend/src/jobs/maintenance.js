const prisma = require('../lib/prisma');
const { computeStatus, daysToExpiry, isoDate } = require('../utils/status');
const { emailPharmacyAdmins, retryFailed } = require('../lib/notifications');
const { safely } = require('../lib/alerts');

const BATCH = 500;

// Returns the active warning stage for a batch.
// Each stage has its own dedupe key, so it is created only once.
function expiryWarningStage(days) {
  if (days < 0 || days > 90) return null;
  if (days <= 30) return 30;
  if (days <= 60) return 60;
  return 90;
}

// Recomputes inventory statuses and creates deduplicated alerts.
async function runMaintenance(now = new Date()) {
  const summary = {
    checked: 0,
    statusChanged: 0,
    alertsCreated: 0,
  };

  const pharmacies = await prisma.pharmacy.findMany({
    select: {
      id: true,
      alertNearExpiry: true,
      alertLowStock: true,
    },
  });

  const prefs = new Map(pharmacies.map((p) => [p.id, p]));
  const created = new Map();

  let cursor;

  for (;;) {
    const items = await prisma.inventoryItem.findMany({
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        medicine: {
          select: {
            name: true,
            strength: true,
          },
        },
      },
    });

    if (!items.length) break;

    cursor = items[items.length - 1].id;

    const byPharmacy = new Map();

    for (const it of items) {
      summary.checked += 1;

      const status = computeStatus(it, now);

      if (status !== it.status) {
        await prisma.inventoryItem.update({
          where: { id: it.id },
          data: { status },
        });

        summary.statusChanged += 1;
      }

      const pharmacy = prefs.get(it.pharmacyId);
      if (!pharmacy) continue;

      const label = `${it.medicine.name} ${it.medicine.strength} (batch ${it.batchNumber})`;
      const days = daysToExpiry(it.expiryDate, now);

      const base = {
        pharmacyId: it.pharmacyId,
        link: '/inventory',
      };

      let alert = null;

      // Expiry warnings: 90 days, 60 days and 30 days.
      // Only batches with remaining stock receive expiry warnings.
      if (
        it.quantity > 0 &&
        pharmacy.alertNearExpiry &&
        days >= 0
      ) {
        const stage = expiryWarningStage(days);

        if (stage) {
          const severity = stage === 30 ? 'URGENT' : 'WARNING';

          alert = {
            ...base,
            type: 'NEAR_EXPIRY',
            severity,
            message:
              `${label} expires in ${days} day(s) ` +
              `(${isoDate(it.expiryDate)}). ` +
              `This is your ${stage}-day expiry warning.`,
            dedupeKey: `NEAR_EXPIRY:${stage}:${it.id}:${isoDate(it.expiryDate)}`,
          };
        }
      }

      // Expired batches.
      if (
        !alert &&
        status === 'EXPIRED' &&
        pharmacy.alertNearExpiry
      ) {
        alert = {
          ...base,
          type: 'EXPIRED',
          severity: 'URGENT',
          message: `${label} expired on ${isoDate(it.expiryDate)}. Remove it from sale.`,
          dedupeKey: `EXPIRED:${it.id}`,
        };
      }

      // Existing low-stock behaviour is unchanged.
      if (
        !alert &&
        status === 'LOW_STOCK' &&
        pharmacy.alertLowStock
      ) {
        alert = {
          ...base,
          type: 'LOW_STOCK',
          severity: 'WARNING',
          message: `${label} is running low (${it.quantity} left).`,
          dedupeKey: `LOW_STOCK:${it.id}:${it.quantity}`,
        };
      }

      // Existing out-of-stock behaviour is unchanged.
      if (
        !alert &&
        status === 'OUT_OF_STOCK' &&
        pharmacy.alertLowStock
      ) {
        alert = {
          ...base,
          type: 'OUT_OF_STOCK',
          severity: 'URGENT',
          message: `${label} is out of stock.`,
          dedupeKey: `OUT_OF_STOCK:${it.id}`,
        };
      }

      if (alert) {
        if (!byPharmacy.has(it.pharmacyId)) {
          byPharmacy.set(it.pharmacyId, []);
        }

        byPharmacy.get(it.pharmacyId).push(alert);
      }
    }

    // Create alerts with database-level duplicate protection.
    for (const [pharmacyId, data] of byPharmacy) {
      const result = await prisma.alert.createMany({
        data,
        skipDuplicates: true,
      });

      summary.alertsCreated += result.count;

      if (result.count > 0) {
        created.set(
          pharmacyId,
          (created.get(pharmacyId) || 0) + result.count
        );
      }
    }

    if (items.length < BATCH) break;
  }

  // Email pharmacies only when new alerts were actually created.
  for (const [pharmacyId, count] of created) {
    if (!count) continue;

    await safely('stock-email', () =>
      emailPharmacyAdmins(pharmacyId, 'emailStock', {
        subject: `PharmaCycle.AI: ${count} new inventory alert(s)`,
        text:
          `Your pharmacy has ${count} new inventory alert(s).\n\n` +
          `Expiry warnings are generated at 90, 60 and 30 days before expiry. ` +
          `Please log in to PharmaCycle.AI to review your alerts.`,
      })
    );
  }

  return summary;
}

module.exports = {
  runMaintenance,
  retryFailed,
};