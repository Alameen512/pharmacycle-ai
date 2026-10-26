const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { requirePharmacy } = require('../middleware/auth');
const { sign } = require('../utils/jwt');

const router = express.Router();

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(190);
const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Use at most 72 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/\d/, 'Include at least one number.');
const optionalText = (max) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());

const registerSchema = z.object({
  pharmacyName: z.string().trim().min(2, 'Enter the pharmacy name.').max(120),
  name: z.string().trim().min(2, 'Enter your full name.').max(100),
  email,
  password,
  city: z.string().trim().min(2, 'Enter a city.').max(80),
  state: z.string().trim().min(2, 'Select a state.').max(80),
  address: optionalText(200),
  phone: optionalText(30),
});
const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password.').max(200) });

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function sessionPayload(user, pharmacy) {
  return {
    token: sign({ type: 'user', userId: user.id, pharmacyId: pharmacy.id, role: user.role }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    pharmacy: {
      id: pharmacy.id, name: pharmacy.name, city: pharmacy.city, state: pharmacy.state,
      verificationStatus: pharmacy.verificationStatus,
    },
  };
}

router.post('/register', validate(registerSchema), async (req, res) => {
  const b = req.body;
  if (await prisma.user.findUnique({ where: { email: b.email }, select: { id: true } })) {
    throw new HttpError(409, 'An account with this email already exists.', 'EMAIL_TAKEN');
  }
  const passwordHash = await bcrypt.hash(b.password, 12);
  // New pharmacies stay PENDING until an operator verifies them (see scripts/verify-pharmacy.js).
  const pharmacy = await prisma.pharmacy.create({
    data: {
      name: b.pharmacyName, city: b.city, state: b.state, address: b.address || '', phone: b.phone,
      users: { create: { name: b.name, email: b.email, passwordHash, role: 'ADMIN' } },
    },
    include: { users: true },
  });
  res.status(201).json(sessionPayload(pharmacy.users[0], pharmacy));
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email: addr, password: pw } = req.body;
  const user = await prisma.user.findUnique({ where: { email: addr }, include: { pharmacy: true } });
  const ok = await bcrypt.compare(pw, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'Incorrect email or password.', 'BAD_CREDENTIALS');
  res.json(sessionPayload(user, user.pharmacy));
});

router.get('/me', requirePharmacy, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth.userId }, include: { pharmacy: true } });
  const { token, ...rest } = sessionPayload(user, user.pharmacy);
  res.json(rest);
});

module.exports = router;
