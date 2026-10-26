const express = require('express');
const prisma = require('../lib/prisma');
const { requirePharmacy } = require('../middleware/auth');

const router = express.Router();
router.use(requirePharmacy);

const STATUSES = ['HEALTHY', 'LOW_STOCK', 'NEAR_EXPIRY', 'OUT_OF_STOCK', 'EXPIRED'];

router.get('/summary', async (req, res) => {
  const pharmacyId = req.auth.pharmacyId;
  const [inventoryRecords, nearExpiryRecords, activeListings, partners, grouped] = await Promise.all([
    prisma.inventoryItem.count({ where: { pharmacyId, deletedAt: null } }),
    prisma.inventoryItem.count({ where: { pharmacyId, deletedAt: null, status: 'NEAR_EXPIRY' } }),
    prisma.transferListing.count({ where: { pharmacyId, status: { in: ['AVAILABLE', 'PENDING'] } } }),
    prisma.pharmacy.count({ where: { verificationStatus: 'VERIFIED', id: { not: pharmacyId } } }),
    prisma.inventoryItem.groupBy({ by: ['status'], where: { pharmacyId, deletedAt: null }, _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  grouped.forEach((g) => (counts[g.status] = g._count._all));
  res.json({ inventoryRecords, nearExpiryRecords, activeListings, partners, statusBreakdown: counts });
});

module.exports = router;
