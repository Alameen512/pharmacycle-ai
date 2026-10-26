const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { requirePharmacy } = require('../middleware/auth');
const { haversineKm } = require('../utils/geo');
const { pagination } = require('../utils/serialize');

const router = express.Router();
router.use(requirePharmacy);

const blank = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const q = z.object({
  search: z.preprocess(blank, z.string().trim().max(100).optional()),
  state: z.preprocess(blank, z.string().trim().max(80).optional()),
  lat: z.preprocess(blank, z.coerce.number().min(-90).max(90).optional()),
  lng: z.preprocess(blank, z.coerce.number().min(-180).max(180).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
const select = { id: true, name: true, address: true, city: true, state: true, phone: true, lat: true, lng: true, verifiedAt: true };

// Verified partners only (other than the caller). Verification state comes from the database.
router.get('/', validate(q, 'query'), async (req, res) => {
  const { search, state, lat, lng, page, pageSize } = req.query;
  const where = {
    verificationStatus: 'VERIFIED', id: { not: req.auth.pharmacyId },
    ...(state ? { state: { equals: state, mode: 'insensitive' } } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }, { address: { contains: search, mode: 'insensitive' } }] } : {}),
  };
  const strip = ({ lat: a, lng: b, ...rest }) => rest;
  if (lat !== undefined && lng !== undefined) {
    const all = await prisma.pharmacy.findMany({ where, select, take: 1000 });
    const withDist = all
      .map((p) => ({ ...strip(p), verificationStatus: 'VERIFIED', distanceKm: p.lat != null && p.lng != null ? haversineKm(lat, lng, p.lat, p.lng) : null }))
      .sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || a.name.localeCompare(b.name));
    return res.json({ pharmacies: withDist.slice((page - 1) * pageSize, page * pageSize), pagination: pagination(page, pageSize, withDist.length), sortedByDistance: true });
  }
  const [total, rows] = await Promise.all([
    prisma.pharmacy.count({ where }),
    prisma.pharmacy.findMany({ where, select, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json({ pharmacies: rows.map((p) => ({ ...strip(p), verificationStatus: 'VERIFIED', distanceKm: null })), pagination: pagination(page, pageSize, total), sortedByDistance: false });
});

module.exports = router;
