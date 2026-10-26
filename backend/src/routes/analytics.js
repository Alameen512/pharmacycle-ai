const express = require('express');
const prisma = require('../lib/prisma');
const { requirePharmacy } = require('../middleware/auth');

const router = express.Router();
router.use(requirePharmacy);

const DAYS = 90;

router.get('/summary', async (req, res) => {
  const pharmacyId = req.auth.pharmacyId;
  const to = new Date();
  const from = new Date(to.getTime() - DAYS * 86400000);
  const [items, incoming, outgoing, sold, partners] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { pharmacyId, deletedAt: null }, select: { quantity: true, status: true, medicine: { select: { category: true } } } }),
    prisma.transferRequest.groupBy({ by: ['status'], where: { listing: { pharmacyId } }, _count: { _all: true } }),
    prisma.transferRequest.groupBy({ by: ['status'], where: { requestingPharmacyId: pharmacyId }, _count: { _all: true } }),
    prisma.salesRecord.aggregate({ where: { pharmacyId, date: { gte: from } }, _sum: { quantitySold: true }, _count: { _all: true } }),
    prisma.pharmacy.count({ where: { verificationStatus: 'VERIFIED', id: { not: pharmacyId } } }),
  ]);

  const categories = {};
  let unitsOnHand = 0;
  let atRiskUnits = 0;
  for (const it of items) {
    const c = (categories[it.medicine.category] ||= { category: it.medicine.category, records: 0, units: 0 });
    c.records += 1;
    c.units += it.quantity;
    if (!['EXPIRED', 'OUT_OF_STOCK'].includes(it.status)) unitsOnHand += it.quantity;
    if (['NEAR_EXPIRY', 'EXPIRED'].includes(it.status)) atRiskUnits += it.quantity;
  }
  const fold = (g) => Object.fromEntries(['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'].map((s) => [s, g.find((x) => x.status === s)?._count._all || 0]));
  const incomingByStatus = fold(incoming);
  const outgoingByStatus = fold(outgoing);
  const unitsSold = sold._sum.quantitySold || 0;

  res.json({
    window: { days: DAYS, from, to },
    categories: Object.values(categories).sort((a, b) => b.units - a.units),
    transfers: { incoming: incomingByStatus, outgoing: outgoingByStatus, completed: incomingByStatus.COMPLETED + outgoingByStatus.COMPLETED },
    atRiskUnits,
    partners,
    sales: {
      recordCount: sold._count._all,
      unitsSold,
      unitsOnHand,
      // Honest name: units sold in the window divided by usable units on hand today. Not accounting-grade turnover.
      salesToStockRatio: unitsOnHand > 0 && sold._count._all > 0 ? Math.round((unitsSold / unitsOnHand) * 100) / 100 : null,
    },
  });
});

module.exports = router;
