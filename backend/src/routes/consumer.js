const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { requireConsumer } = require('../middleware/auth');
const { sign } = require('../utils/jwt');
const { todayLagosUtcMs } = require('../utils/status');
const { haversineKm } = require('../utils/geo');
const { num } = require('../utils/serialize');
const { pushAlert, safely } = require('../lib/alerts');
const { emailPharmacyAdmins } = require('../lib/notifications');

const router = express.Router();

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(190);
const password = z.string().min(8, 'Use at least 8 characters.').max(72).regex(/[A-Za-z]/, 'Include a letter.').regex(/\d/, 'Include a number.');
const opt = (max) => z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());

const registerSchema = z.object({ name: z.string().trim().min(2, 'Enter your name.').max(100), email, password, city: opt(80), state: opt(80) });
const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password.').max(200) });
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const payload = (c) => ({
  token: sign({ type: 'consumer', consumerId: c.id }),
  consumer: { id: c.id, name: c.name, email: c.email, city: c.city, state: c.state },
});

router.post('/auth/register', validate(registerSchema), async (req, res) => {
  const b = req.body;
  if (await prisma.consumer.findUnique({ where: { email: b.email }, select: { id: true } })) {
    throw new HttpError(409, 'An account with this email already exists.', 'EMAIL_TAKEN');
  }
  const c = await prisma.consumer.create({
    data: { name: b.name, email: b.email, passwordHash: await bcrypt.hash(b.password, 12), city: b.city, state: b.state },
  });
  res.status(201).json(payload(c));
});

router.post('/auth/login', validate(loginSchema), async (req, res) => {
  const c = await prisma.consumer.findUnique({ where: { email: req.body.email } });
  const ok = await bcrypt.compare(req.body.password, c ? c.passwordHash : DUMMY_HASH);
  if (!c || !ok) throw new HttpError(401, 'Incorrect email or password.', 'BAD_CREDENTIALS');
  res.json(payload(c));
});

// Account-only benefit: a saved default location that pre-fills the search form.
router.get('/me', requireConsumer, async (req, res) => {
  const { token, ...rest } = payload(await prisma.consumer.findUnique({ where: { id: req.consumerId } }));
  res.json(rest);
});

router.patch('/me', requireConsumer, validate(z.object({ city: opt(80), state: opt(80) })), async (req, res) => {
  const c = await prisma.consumer.update({ where: { id: req.consumerId }, data: { city: req.body.city ?? null, state: req.body.state ?? null } });
  const { token, ...rest } = payload(c);
  res.json(rest);
});

const searchSchema = z.object({
  medicine: z.string().trim().min(2, 'Enter at least 2 letters of the medicine name.').max(100),
  city: opt(80),
  state: opt(80),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

// Public. Only verified pharmacies' in-date, unreserved stock is returned.
router.get('/search', validate(searchSchema, 'query'), async (req, res) => {
  const { medicine, city, state, lat, lng } = req.query;
  const rows = await prisma.inventoryItem.findMany({
    where: {
      deletedAt: null,
      quantity: { gt: 0 },
      expiryDate: { gte: new Date(todayLagosUtcMs()) },
      status: { in: ['HEALTHY', 'LOW_STOCK', 'NEAR_EXPIRY'] },
      medicine: { name: { contains: medicine, mode: 'insensitive' } },
      pharmacy: {
        verificationStatus: 'VERIFIED',
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        ...(state ? { state: { equals: state, mode: 'insensitive' } } : {}),
      },
    },
    include: { medicine: true, pharmacy: { select: { id: true, name: true, address: true, city: true, state: true, phone: true, lat: true, lng: true } } },
    take: 300,
  });
  const hasCoords = lat !== undefined && lng !== undefined;
  const results = rows
    .filter((r) => r.quantity - r.reservedQty > 0)
    .map((r) => ({
      id: r.id,
      medicine: { name: r.medicine.name, strength: r.medicine.strength, dosageForm: r.medicine.dosageForm, category: r.medicine.category },
      price: num(r.sellingPrice),
      quantity: r.quantity - r.reservedQty,
      expiryDate: r.expiryDate,
      pharmacy: { id: r.pharmacy.id, name: r.pharmacy.name, address: r.pharmacy.address, city: r.pharmacy.city, state: r.pharmacy.state, phone: r.pharmacy.phone },
      distanceKm: hasCoords && r.pharmacy.lat != null && r.pharmacy.lng != null ? haversineKm(lat, lng, r.pharmacy.lat, r.pharmacy.lng) : null,
    }));
  const sortByDistance = hasCoords && results.some((r) => r.distanceKm !== null);
  results.sort((a, b) =>
    sortByDistance
      ? (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9)
      : a.medicine.name.localeCompare(b.medicine.name) || a.price - b.price
  );
  res.json({ results: results.slice(0, 50), total: results.length, sortedByDistance: sortByDistance });
});



const deliveryRequestSchema = z.object({
  inventoryItemId: z.string().uuid('Invalid medicine listing.'),
  customerName: z.string().trim().min(2, 'Enter your name.').max(100),
  customerPhone: z.string().trim().min(7, 'Enter a valid phone number.').max(30),
  customerEmail: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().trim().toLowerCase().email('Enter a valid email address.').max(190).optional()
  ),
  deliveryAddress: z.string().trim().min(5, 'Enter your delivery address.').max(500),
  quantity: z.coerce.number().int().min(1).max(1000),
});

router.post('/delivery-requests', validate(deliveryRequestSchema), async (req, res) => {
  const {
    inventoryItemId,
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    quantity,
  } = req.body;

  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: inventoryItemId,
      deletedAt: null,
      quantity: { gt: 0 },
      expiryDate: { gte: new Date(todayLagosUtcMs()) },
      status: { in: ['HEALTHY', 'LOW_STOCK', 'NEAR_EXPIRY'] },
      pharmacy: { verificationStatus: 'VERIFIED' },
    },
    include: {
      medicine: true,
      pharmacy: { select: { id: true, name: true } },
    },
  });

  if (!item || item.quantity - item.reservedQty < quantity) {
    throw new HttpError(
      400,
      'This medicine is no longer available in the requested quantity. Please search again.',
      'INSUFFICIENT_STOCK'
    );
  }

  const request = await prisma.deliveryRequest.create({
    data: {
      pharmacyId: item.pharmacyId,
      inventoryItemId: item.id,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      quantity,
      unitPrice: item.sellingPrice,
    },
  });

  await safely('delivery-request-alert', () =>
    pushAlert({
      pharmacyId: item.pharmacyId,
      type: 'DELIVERY_REQUEST',
      severity: 'INFO',
      message: `New delivery request: ${quantity} × ${item.medicine.name} from ${customerName}.`,
      link: '/alerts',
      dedupeKey: `delivery-request:${request.id}`,
    })
  );

  await safely('delivery-request-email', () =>
    emailPharmacyAdmins(item.pharmacyId, 'emailDelivery', {
      subject: `New delivery request — ${item.medicine.name}`,
      text: [
        `A customer has requested delivery from ${item.pharmacy.name}.`,
        '',
        `Medicine: ${item.medicine.name} ${item.medicine.strength}`,
        `Quantity: ${quantity}`,
        `Unit price: ${num(item.sellingPrice)}`,
        `Customer: ${customerName}`,
        `Phone: ${customerPhone}`,
        `Email: ${customerEmail || 'Not provided'}`,
        `Delivery address: ${deliveryAddress}`,
        '',
        'Status: PENDING',
        'This is a request, not a confirmed order. Contact the customer to confirm stock, delivery fee and payment.',
      ].join('\n'),
    })
  );

  res.status(201).json({
    message: 'Your delivery request has been submitted. The pharmacy must confirm availability, delivery fees and payment before the order is confirmed.',
    request: {
      id: request.id,
      status: request.status,
      quantity: request.quantity,
      unitPrice: num(request.unitPrice),
      createdAt: request.createdAt,
    },
  });
});

module.exports = router;
