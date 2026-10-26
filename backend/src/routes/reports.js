const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { requirePharmacy } = require('../middleware/auth');
const { toCsv } = require('../utils/csv');
const { parseDateOnly, isoDate } = require('../utils/status');

const router = express.Router();
router.use(requirePharmacy);

const blank = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const date = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').optional());
const BATCH = 1000;

// Pulls EVERY matching row in keyset-paged batches (no silent row cap).
async function fetchAll(model, args) {
  const rows = [];
  let cursor;
  for (;;) {
    const page = await prisma[model].findMany({ ...args, orderBy: { id: 'asc' }, take: BATCH, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    rows.push(...page);
    if (page.length < BATCH) break;
    cursor = page[page.length - 1].id;
  }
  return rows;
}

function send(res, filename, csv, count) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Row-Count', String(count));
  res.send(csv);
}

router.get('/inventory.csv', validate(z.object({ status: z.preprocess(blank, z.enum(['HEALTHY', 'LOW_STOCK', 'NEAR_EXPIRY', 'OUT_OF_STOCK', 'EXPIRED']).optional()) }), 'query'), async (req, res) => {
  const { status } = req.query;
  const rows = await fetchAll('inventoryItem', { where: { pharmacyId: req.auth.pharmacyId, deletedAt: null, ...(status ? { status } : {}) }, include: { medicine: true } });
  const csv = toCsv(
    [
      { header: 'Medicine', value: (r) => r.medicine.name },
      { header: 'Strength', value: (r) => r.medicine.strength },
      { header: 'Form', value: (r) => r.medicine.dosageForm },
      { header: 'Category', value: (r) => r.medicine.category },
      { header: 'Batch number', value: (r) => r.batchNumber },
      { header: 'NAFDAC reg. no. (as entered)', value: (r) => r.nafdacRegNo },
      { header: 'Quantity', value: (r) => r.quantity },
      { header: 'Reserved for transfers', value: (r) => r.reservedQty },
      { header: 'Cost price (NGN)', value: (r) => Number(r.costPrice).toFixed(2) },
      { header: 'Selling price (NGN)', value: (r) => Number(r.sellingPrice).toFixed(2) },
      { header: 'Expiry date', value: (r) => isoDate(r.expiryDate) },
      { header: 'Status', value: (r) => r.status },
    ],
    rows
  );
  send(res, `inventory-${status || 'all'}-${isoDate(new Date())}.csv`, csv, rows.length);
});

router.get('/transfers.csv', validate(z.object({ from: date, to: date }), 'query'), async (req, res) => {
  const { from, to } = req.query;
  const me = req.auth.pharmacyId;
  const createdAt = {
    ...(from ? { gte: parseDateOnly(from) } : {}),
    ...(to ? { lt: new Date(parseDateOnly(to).getTime() + 86400000) } : {}),
  };
  const rows = await fetchAll('transferRequest', {
    where: { OR: [{ requestingPharmacyId: me }, { listing: { pharmacyId: me } }], ...(from || to ? { createdAt } : {}) },
    include: { listing: { include: { inventoryItem: { include: { medicine: true } }, pharmacy: { select: { id: true, name: true } } } }, requestingPharmacy: { select: { name: true } } },
  });
  const csv = toCsv(
    [
      { header: 'Request ID', value: (r) => r.id },
      { header: 'Direction', value: (r) => (r.requestingPharmacyId === me ? 'Outgoing (we requested)' : 'Incoming (we supply)') },
      { header: 'Status', value: (r) => r.status },
      { header: 'Medicine', value: (r) => `${r.listing.inventoryItem.medicine.name} ${r.listing.inventoryItem.medicine.strength}` },
      { header: 'Form', value: (r) => r.listing.inventoryItem.medicine.dosageForm },
      { header: 'Batch number', value: (r) => r.listing.inventoryItem.batchNumber },
      { header: 'Quantity', value: (r) => r.quantity },
      { header: 'Unit price (NGN)', value: (r) => Number(r.unitPrice).toFixed(2) },
      { header: 'Total (NGN)', value: (r) => (Number(r.unitPrice) * r.quantity).toFixed(2) },
      { header: 'Partner pharmacy', value: (r) => (r.requestingPharmacyId === me ? r.listing.pharmacy.name : r.requestingPharmacy.name) },
      { header: 'Requested at', value: (r) => r.createdAt },
      { header: 'Responded at', value: (r) => r.respondedAt },
      { header: 'Completed at', value: (r) => r.completedAt },
    ],
    rows
  );
  send(res, `transfers-${from || 'start'}_to_${to || 'today'}.csv`, csv, rows.length);
});

module.exports = router;
