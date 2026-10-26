const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { requirePharmacy } = require('../middleware/auth');
const ai = require('../lib/ai');
const { daysToExpiry } = require('../utils/status');

const router = express.Router();
router.use(requirePharmacy);

const TYPES = ['EXPIRY_RISK', 'DEMAND_FORECAST', 'RESTOCK_SUGGESTION'];
const DISCLAIMER = 'Decision support based on your recorded stock and sales only. It is not medical advice and can be wrong; check it against your own judgement.';
const DAY = 86400000;

router.get('/', async (req, res) => {
  const out = {};
  for (const type of TYPES) {
    out[type] = await prisma.aIInsight.findFirst({ where: { pharmacyId: req.auth.pharmacyId, type }, orderBy: { generatedAt: 'desc' } });
  }
  res.json({ insights: out, configured: ai.isConfigured() });
});

async function gather(type, pharmacyId) {
  const now = Date.now();
  if (type === 'EXPIRY_RISK') {
    const items = await prisma.inventoryItem.findMany({
      where: { pharmacyId, deletedAt: null, status: { in: ['NEAR_EXPIRY', 'LOW_STOCK'] } }, include: { medicine: true }, orderBy: { expiryDate: 'asc' }, take: 40,
    });
    if (!items.length) return { empty: 'no_data', message: 'No near-expiry or low-stock items to analyse yet.' };
    return {
      windowDays: 30,
      inputs: { items: items.length },
      prompt: 'Identify which items carry the most expiry or stock-out risk and what to do (discount, transfer to a partner pharmacy, reorder). Items:\n' +
        JSON.stringify(items.map((i) => ({ medicine: `${i.medicine.name} ${i.medicine.strength} ${i.medicine.dosageForm}`, quantity: i.quantity, daysToExpiry: daysToExpiry(i.expiryDate), sellingPriceNgn: Number(i.sellingPrice), status: i.status }))),
    };
  }
  if (type === 'DEMAND_FORECAST') {
    const rows = await prisma.salesRecord.findMany({ where: { pharmacyId, date: { gte: new Date(now - 90 * DAY) } }, include: { medicine: true }, take: 10000 });
    const days = new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
    if (rows.length < 10 || days.size < 7) {
      return { empty: 'insufficient_data', message: `Not enough sales history to forecast demand (found ${rows.length} sales record(s) across ${days.size} day(s); need at least 10 records across 7 days). Record sales from the Inventory page first.` };
    }
    const by = {};
    for (const r of rows) {
      const k = `${r.medicine.name} ${r.medicine.strength}`;
      const age = Math.floor((now - r.date.getTime()) / DAY);
      const b = (by[k] ||= { medicine: k, sold_last_30_days: 0, sold_31_to_60_days_ago: 0, sold_61_to_90_days_ago: 0 });
      b[age < 30 ? 'sold_last_30_days' : age < 60 ? 'sold_31_to_60_days_ago' : 'sold_61_to_90_days_ago'] += r.quantitySold;
    }
    const month = new Date().toLocaleString('en-NG', { month: 'long', timeZone: 'Africa/Lagos' });
    return {
      windowDays: 90,
      inputs: { salesRecords: rows.length, medicines: Object.keys(by).length, daysWithSales: days.size },
      prompt: `It is ${month} in Nigeria. Forecast likely demand for the next 30 days per medicine from this sales history, noting the trend. You may mention general Nigerian seasonal demand context (e.g. rainy season, harmattan) only as a demand factor, never as medical advice.\n` + JSON.stringify(Object.values(by).slice(0, 40)),
    };
  }
  const [items, sales] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { pharmacyId, deletedAt: null }, include: { medicine: true }, take: 200 }),
    prisma.salesRecord.groupBy({ by: ['medicineId'], where: { pharmacyId, date: { gte: new Date(now - 30 * DAY) } }, _sum: { quantitySold: true } }),
  ]);
  if (!items.length) return { empty: 'no_data', message: 'Add inventory first so there is stock to review.' };
  const soldBy = new Map(sales.map((s) => [s.medicineId, s._sum.quantitySold]));
  const agg = {};
  for (const i of items) {
    if (['EXPIRED'].includes(i.status)) continue;
    const k = i.medicineId;
    const a = (agg[k] ||= { medicine: `${i.medicine.name} ${i.medicine.strength} ${i.medicine.dosageForm}`, unitsOnHand: 0, soldLast30Days: soldBy.get(k) || 0, hasSalesData: soldBy.has(k) });
    a.unitsOnHand += i.quantity;
  }
  return {
    windowDays: 30,
    inputs: { medicines: Object.keys(agg).length, medicinesWithSales: sales.length },
    prompt: 'Suggest which medicines to restock and roughly how much, based on units on hand against the last 30 days of sales. Where hasSalesData is false, say sales data is missing instead of guessing.\n' + JSON.stringify(Object.values(agg).slice(0, 60)),
  };
}

router.post('/generate', validate(z.object({ type: z.enum(TYPES) })), async (req, res) => {
  if (!ai.isConfigured()) {
    return res.status(503).json({ error: 'AI insights are not configured on this server (GROQ_API_KEY missing).', code: 'AI_NOT_CONFIGURED' });
  }
  const g = await gather(req.body.type, req.auth.pharmacyId);
  if (g.empty) return res.json({ status: g.empty, message: g.message });
  const out = await ai.generateJson({ system: ai.SYSTEM_BASE, user: g.prompt });
  const saved = await prisma.aIInsight.create({
    data: {
      pharmacyId: req.auth.pharmacyId, type: req.body.type, inputWindowDays: g.windowDays, model: out.model,
      payload: { summary: out.summary, recommendations: out.recommendations, inputs: g.inputs, disclaimer: DISCLAIMER },
    },
  });
  res.status(201).json({ status: 'ok', insight: saved });
});

module.exports = router;
