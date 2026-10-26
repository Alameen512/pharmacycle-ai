const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { requirePharmacy, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requirePharmacy);

const blank = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
const PREFS = ['alertNearExpiry', 'alertLowStock', 'alertTransfer', 'emailTransfer', 'emailStock'];

async function load(req) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.auth.userId }, include: { pharmacy: true } });
  const { pharmacy: p } = user;
  return {
    pharmacy: {
      id: p.id, name: p.name, address: p.address, city: p.city, state: p.state, phone: p.phone, lat: p.lat, lng: p.lng,
      verificationStatus: p.verificationStatus, verifiedAt: p.verifiedAt,
    },
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    preferences: Object.fromEntries(PREFS.map((k) => [k, p[k]])),
  };
}

router.get('/profile', async (req, res) => res.json(await load(req)));

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  state: z.string().trim().min(2).max(80).optional(),
  phone: z.preprocess(blank, z.string().trim().max(30).nullable().optional()),
  lat: z.preprocess(blank, z.coerce.number().min(-90).max(90).nullable().optional()),
  lng: z.preprocess(blank, z.coerce.number().min(-180).max(180).nullable().optional()),
  contactName: z.string().trim().min(2).max(100).optional(),
  preferences: z.object(Object.fromEntries(PREFS.map((k) => [k, z.boolean().optional()]))).optional(),
});

router.patch('/profile', requireRole('ADMIN'), validate(schema), async (req, res) => {
  const { contactName, preferences, ...fields } = req.body;
  await prisma.$transaction([
    prisma.pharmacy.update({ where: { id: req.auth.pharmacyId }, data: { ...fields, ...(preferences || {}) } }),
    ...(contactName ? [prisma.user.update({ where: { id: req.auth.userId }, data: { name: contactName } })] : []),
  ]);
  res.json(await load(req));
});

module.exports = router;
