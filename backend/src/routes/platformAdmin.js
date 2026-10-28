const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { sign, verify } = require('../utils/jwt');

const router = express.Router();

// Separate authentication for the platform administrator.
function requirePlatformAdmin(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Please log in as platform admin.', 'AUTH_REQUIRED');
  }

  try {
    const payload = verify(token);

    if (payload.type !== 'platform-admin') {
      throw new Error('Wrong account type');
    }

    req.platformAdmin = true;
    next();
  } catch {
    throw new HttpError(401, 'Your admin session is invalid or expired.', 'TOKEN_INVALID');
  }
}

// Platform admin login.
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPasswordHash = process.env.PLATFORM_ADMIN_PASSWORD_HASH || '';

  if (!adminEmail || !adminPasswordHash) {
    throw new HttpError(
      503,
      'Platform admin login has not been configured.',
      'ADMIN_NOT_CONFIGURED'
    );
  }

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.trim().toLowerCase() !== adminEmail ||
    !(await bcrypt.compare(password, adminPasswordHash))
  ) {
    throw new HttpError(401, 'Incorrect admin email or password.', 'BAD_CREDENTIALS');
  }

  const token = sign({
    type: 'platform-admin',
    email: adminEmail,
  });

  res.json({
    token,
    admin: { email: adminEmail },
  });
});

// Dashboard statistics.
router.get('/stats', requirePlatformAdmin, async (req, res) => {
  const [pending, verified, rejected] = await Promise.all([
    prisma.pharmacy.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.pharmacy.count({ where: { verificationStatus: 'VERIFIED' } }),
    prisma.pharmacy.count({ where: { verificationStatus: 'REJECTED' } }),
  ]);

  res.json({ pending, verified, rejected, total: pending + verified + rejected });
});

// List pharmacies, optionally filtered by verification status.
router.get('/pharmacies', requirePlatformAdmin, async (req, res) => {
  const allowed = ['PENDING', 'VERIFIED', 'REJECTED'];
  const requested = String(req.query.status || 'PENDING').toUpperCase();

  if (!allowed.includes(requested)) {
    throw new HttpError(400, 'Invalid verification status.', 'INVALID_STATUS');
  }

  const pharmacies = await prisma.pharmacy.findMany({
    where: { verificationStatus: requested },
    include: {
      users: {
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({
    pharmacies: pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      state: p.state,
      address: p.address,
      phone: p.phone,
      verificationStatus: p.verificationStatus,
      createdAt: p.createdAt,
      users: p.users,
    })),
  });
});

// Approve or reject a pharmacy.
router.patch('/pharmacies/:id/verification', requirePlatformAdmin, async (req, res) => {
  const { status } = req.body || {};

  if (!['VERIFIED', 'REJECTED'].includes(status)) {
    throw new HttpError(
      400,
      'Status must be VERIFIED or REJECTED.',
      'INVALID_STATUS'
    );
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, verificationStatus: true },
  });

  if (!pharmacy) {
    throw new HttpError(404, 'Pharmacy not found.', 'PHARMACY_NOT_FOUND');
  }

  const updated = await prisma.pharmacy.update({
    where: { id: pharmacy.id },
    data: {
      verificationStatus: status,
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
    },
    select: { id: true, name: true, verificationStatus: true, verifiedAt: true },
  });

  res.json({
    message: status === 'VERIFIED' ? 'Pharmacy approved successfully.' : 'Pharmacy rejected.',
    pharmacy: updated,
  });
});

module.exports = router;