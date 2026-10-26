const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const { verify } = require('../utils/jwt');

function decode(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Please log in to continue.', 'AUTH_REQUIRED');
  try {
    return verify(token);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please log in again.', 'TOKEN_INVALID');
  }
}

// Pharmacy staff only. Loads fresh role + verification state on every request.
async function requirePharmacy(req, res, next) {
  const p = decode(req);
  if (p.type !== 'user') throw new HttpError(403, 'This area is for pharmacy accounts.', 'WRONG_ACCOUNT_TYPE');
  const user = await prisma.user.findUnique({
    where: { id: p.userId },
    select: { id: true, name: true, role: true, pharmacyId: true, pharmacy: { select: { verificationStatus: true, name: true } } },
  });
  if (!user) throw new HttpError(401, 'This account no longer exists.', 'TOKEN_INVALID');
  req.auth = {
    userId: user.id,
    userName: user.name,
    pharmacyId: user.pharmacyId,
    pharmacyName: user.pharmacy.name,
    role: user.role,
    verificationStatus: user.pharmacy.verificationStatus,
  };
  next();
}

function requireVerified(req, res, next) {
  if (req.auth.verificationStatus !== 'VERIFIED') {
    throw new HttpError(403, 'Your pharmacy is not verified yet, so transfers are disabled.', 'PHARMACY_NOT_VERIFIED');
  }
  next();
}

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.auth.role)) throw new HttpError(403, 'You do not have permission to do this.', 'FORBIDDEN');
  next();
};

async function requireConsumer(req, res, next) {
  const p = decode(req);
  if (p.type !== 'consumer') throw new HttpError(403, 'This area is for general-user accounts.', 'WRONG_ACCOUNT_TYPE');
  const consumer = await prisma.consumer.findUnique({ where: { id: p.consumerId }, select: { id: true } });
  if (!consumer) throw new HttpError(401, 'This account no longer exists.', 'TOKEN_INVALID');
  req.consumerId = consumer.id;
  next();
}

module.exports = { requirePharmacy, requireVerified, requireRole, requireConsumer };
