const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { requirePharmacy, requireVerified } = require('../middleware/auth');
const { todayLagosUtcMs, daysToExpiry } = require('../utils/status');
const { pagination, num } = require('../utils/serialize');
const { lockItem, lockListing, listedOpen, listingRemaining, nextListingStatus, unitPrice } = require('../lib/stock');
const { pushAlert, safely } = require('../lib/alerts');
const { emailPharmacyAdmins } = require('../lib/notifications');

const router = express.Router();
router.use(requirePharmacy);

const blank = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const pageQuery = z.object({
  search: z.preprocess(blank, z.string().trim().max(100).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
const listingInclude = { inventoryItem: { include: { medicine: true } } };
const label = (l) => `${l.inventoryItem.medicine.name} ${l.inventoryItem.medicine.strength}`;

function shapeListing(l, extra = {}) {
  const it = l.inventoryItem;
  return {
    id: l.id,
    status: l.status,
    quantity: l.quantity,
    remaining: listingRemaining(l),
    reservedQty: l.reservedQty,
    completedQty: l.completedQty,
    discountPercent: l.discountPercent,
    originalPrice: num(it.sellingPrice),
    unitPrice: unitPrice(it.sellingPrice, l.discountPercent),
    createdAt: l.createdAt,
    inventoryItemId: l.inventoryItemId,
    medicine: { name: it.medicine.name, strength: it.medicine.strength, dosageForm: it.medicine.dosageForm },
    batchNumber: it.batchNumber,
    expiryDate: it.expiryDate,
    daysToExpiry: daysToExpiry(it.expiryDate),
    ...extra,
  };
}

// Other verified pharmacies' open listings
router.get('/available', validate(pageQuery, 'query'), async (req, res) => {
  const { search, page, pageSize } = req.query;
  const where = {
    status: 'AVAILABLE',
    pharmacyId: { not: req.auth.pharmacyId },
    pharmacy: { verificationStatus: 'VERIFIED' },
    inventoryItem: {
      deletedAt: null,
      expiryDate: { gte: new Date(todayLagosUtcMs()) },
      ...(search ? { medicine: { name: { contains: search, mode: 'insensitive' } } } : {}),
    },
  };
  const [total, rows] = await Promise.all([
    prisma.transferListing.count({ where }),
    prisma.transferListing.findMany({
      where, include: { ...listingInclude, pharmacy: { select: { id: true, name: true, city: true, state: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize,
    }),
  ]);
  res.json({ listings: rows.map((l) => shapeListing(l, { pharmacy: l.pharmacy })), pagination: pagination(page, pageSize, total) });
});

router.get('/mine', async (req, res) => {
  const rows = await prisma.transferListing.findMany({
    where: { pharmacyId: req.auth.pharmacyId },
    include: { ...listingInclude, _count: { select: { requests: { where: { status: 'PENDING' } } } } },
    orderBy: { createdAt: 'desc' }, take: 100,
  });
  res.json({ listings: rows.map((l) => shapeListing(l, { pendingRequests: l._count.requests })) });
});

const createSchema = z.object({
  inventoryItemId: z.string().min(1, 'Choose an item to list.'),
  quantity: z.coerce.number().int('Whole units only.').min(1, 'Enter at least 1.').max(1_000_000),
  discountPercent: z.coerce.number().min(0, 'Cannot be negative.').max(90, 'Maximum discount is 90%.').default(0),
});

router.post('/', requireVerified, validate(createSchema), async (req, res) => {
  const b = req.body;
  const listing = await prisma.$transaction(async (tx) => {
    await lockItem(tx, b.inventoryItemId);
    const item = await tx.inventoryItem.findFirst({ where: { id: b.inventoryItemId, pharmacyId: req.auth.pharmacyId, deletedAt: null } });
    if (!item) throw new HttpError(404, 'Inventory item not found.', 'NOT_FOUND');
    if (!['HEALTHY', 'LOW_STOCK', 'NEAR_EXPIRY'].includes(item.status)) throw new HttpError(409, 'Only in-date stock can be listed for transfer.', 'NOT_ELIGIBLE');
    const open = await listedOpen(tx, item.id);
    const free = item.quantity - open;
    if (b.quantity > free) throw new HttpError(409, free > 0 ? `Only ${free} unit(s) are free to list.` : 'All units of this item are already listed.', 'OVER_LISTED');
    return tx.transferListing.create({
      data: { inventoryItemId: item.id, pharmacyId: req.auth.pharmacyId, quantity: b.quantity, discountPercent: b.discountPercent },
      include: listingInclude,
    });
  });
  res.status(201).json(shapeListing(listing));
});

const patchSchema = z.object({
  quantity: z.coerce.number().int('Whole units only.').min(1).max(1_000_000).optional(),
  discountPercent: z.coerce.number().min(0).max(90).optional(),
}).refine((o) => Object.keys(o).length > 0, 'Nothing to update.');

router.patch('/:id', requireVerified, validate(patchSchema), async (req, res) => {
  const pre = await prisma.transferListing.findFirst({ where: { id: req.params.id, pharmacyId: req.auth.pharmacyId } });
  if (!pre) throw new HttpError(404, 'Listing not found.', 'NOT_FOUND');
  const updated = await prisma.$transaction(async (tx) => {
    await lockListing(tx, pre.id);
    await lockItem(tx, pre.inventoryItemId);
    const l = await tx.transferListing.findUniqueOrThrow({ where: { id: pre.id } });
    if (!['AVAILABLE', 'PENDING'].includes(l.status)) throw new HttpError(409, 'This listing is closed and cannot be edited.', 'CLOSED');
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: l.inventoryItemId } });
    const quantity = req.body.quantity ?? l.quantity;
    if (quantity < l.reservedQty + l.completedQty) {
      throw new HttpError(409, `At least ${l.reservedQty + l.completedQty} unit(s) are already accepted or transferred.`, 'BELOW_COMMITTED');
    }
    const othersOpen = (await listedOpen(tx, item.id)) - (l.quantity - l.completedQty);
    if (othersOpen + (quantity - l.completedQty) > item.quantity) throw new HttpError(409, 'Not enough free stock for that quantity.', 'OVER_LISTED');
    const next = { ...l, quantity, discountPercent: req.body.discountPercent ?? l.discountPercent };
    return tx.transferListing.update({
      where: { id: l.id }, data: { quantity, discountPercent: next.discountPercent, status: nextListingStatus(next) }, include: listingInclude,
    });
  });
  res.json(shapeListing(updated));
});

router.post('/:id/cancel', async (req, res) => {
  const pre = await prisma.transferListing.findFirst({ where: { id: req.params.id, pharmacyId: req.auth.pharmacyId }, include: listingInclude });
  if (!pre) throw new HttpError(404, 'Listing not found.', 'NOT_FOUND');
  const closed = await prisma.$transaction(async (tx) => {
    await lockListing(tx, pre.id);
    const l = await tx.transferListing.findUniqueOrThrow({ where: { id: pre.id } });
    if (!['AVAILABLE', 'PENDING'].includes(l.status)) throw new HttpError(409, 'This listing is already closed.', 'CLOSED');
    if (l.reservedQty > 0) throw new HttpError(409, 'Some units are already accepted by another pharmacy. Reject those requests first.', 'HAS_RESERVATIONS');
    const pending = await tx.transferRequest.findMany({ where: { listingId: l.id, status: 'PENDING' } });
    for (const r of pending) {
      await tx.transferRequest.update({ where: { id: r.id }, data: { status: 'CANCELLED', respondedAt: new Date() } });
      await tx.transferEvent.create({
        data: { requestId: r.id, actorPharmacyId: req.auth.pharmacyId, actorUserId: req.auth.userId, type: 'CANCELLED', fromStatus: 'PENDING', toStatus: 'CANCELLED', quantity: r.quantity, note: 'Listing cancelled by owner' },
      });
    }
    await tx.transferListing.update({ where: { id: l.id }, data: { status: 'CANCELLED' } });
    return pending;
  });
  for (const r of closed) {
    await safely('cancel-alert', () =>
      pushAlert({
        pharmacyId: r.requestingPharmacyId, type: 'TRANSFER_UPDATE', severity: 'INFO', link: '/transfer-requests',
        message: `${req.auth.pharmacyName} withdrew the listing for ${label(pre)}. Your request was cancelled.`, dedupeKey: `TRANSFER:${r.id}:CANCELLED`,
      })
    );
  }
  res.json({ ok: true, cancelledRequests: closed.length });
});

const requestSchema = z.object({
  quantity: z.coerce.number().int('Whole units only.').min(1, 'Enter at least 1.').max(1_000_000),
  message: z.preprocess(blank, z.string().trim().max(300).optional()),
});

router.post('/:id/request', requireVerified, validate(requestSchema), async (req, res) => {
  const { quantity, message } = req.body;
  const out = await prisma.$transaction(async (tx) => {
    await lockListing(tx, req.params.id);
    const l = await tx.transferListing.findUnique({ where: { id: req.params.id }, include: { ...listingInclude, pharmacy: { select: { verificationStatus: true } } } });
    if (!l || l.pharmacy.verificationStatus !== 'VERIFIED' || l.inventoryItem.deletedAt) throw new HttpError(404, 'Listing not found.', 'NOT_FOUND');
    if (l.pharmacyId === req.auth.pharmacyId) throw new HttpError(403, 'You cannot request your own listing.', 'OWN_LISTING');
    if (l.status !== 'AVAILABLE') throw new HttpError(409, 'This listing is no longer available.', 'NOT_AVAILABLE');
    if (daysToExpiry(l.inventoryItem.expiryDate) < 0) throw new HttpError(409, 'This stock has expired.', 'EXPIRED');
    const remaining = listingRemaining(l);
    if (quantity > remaining) throw new HttpError(409, `Only ${remaining} unit(s) are available.`, 'OVER_REQUEST');
    const open = await tx.transferRequest.findFirst({ where: { listingId: l.id, requestingPharmacyId: req.auth.pharmacyId, status: { in: ['PENDING', 'ACCEPTED'] } }, select: { id: true } });
    if (open) throw new HttpError(409, 'You already have an open request for this listing.', 'DUPLICATE_REQUEST');
    const request = await tx.transferRequest.create({
      data: { listingId: l.id, requestingPharmacyId: req.auth.pharmacyId, quantity, message, unitPrice: unitPrice(l.inventoryItem.sellingPrice, l.discountPercent) },
    });
    await tx.transferEvent.create({
      data: { requestId: request.id, actorPharmacyId: req.auth.pharmacyId, actorUserId: req.auth.userId, type: 'REQUESTED', toStatus: 'PENDING', quantity, note: message },
    });
    return { request, listing: l };
  });
  const { request, listing } = out;
  await safely('request-alert', () =>
    pushAlert({
      pharmacyId: listing.pharmacyId, type: 'TRANSFER_REQUEST', severity: 'INFO', link: '/transfer-requests',
      message: `${req.auth.pharmacyName} requested ${quantity} × ${label(listing)}.`, dedupeKey: `TRANSFER:${request.id}:PENDING`,
    })
  );
  await safely('request-email', () =>
    emailPharmacyAdmins(listing.pharmacyId, 'emailTransfer', {
      subject: 'New transfer request on PharmaCycle.AI',
      text: `${req.auth.pharmacyName} requested ${quantity} unit(s) of ${label(listing)}.\nLog in to accept or reject the request.`,
    })
  );
  res.status(201).json({ id: request.id, status: request.status, quantity: request.quantity, unitPrice: num(request.unitPrice) });
});

module.exports = router;
