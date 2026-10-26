const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { requirePharmacy, requireVerified } = require('../middleware/auth');
const { computeStatus } = require('../utils/status');
const { pagination, num } = require('../utils/serialize');
const { lockItem, lockListing, nextListingStatus, listingRemaining } = require('../lib/stock');
const { pushAlert, safely } = require('../lib/alerts');
const { emailPharmacyAdmins } = require('../lib/notifications');

const router = express.Router();
router.use(requirePharmacy);

const STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'];
const blank = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const listQuery = z.object({
  direction: z.enum(['incoming', 'outgoing']).default('incoming'),
  status: z.preprocess(blank, z.enum(STATUSES).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const include = {
  listing: { include: { inventoryItem: { include: { medicine: true } }, pharmacy: { select: { id: true, name: true, city: true, state: true, phone: true } } } },
  requestingPharmacy: { select: { id: true, name: true, city: true, state: true, phone: true } },
};

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { direction, status, page, pageSize } = req.query;
  const me = req.auth.pharmacyId;
  const where = { ...(direction === 'incoming' ? { listing: { pharmacyId: me } } : { requestingPharmacyId: me }), ...(status ? { status } : {}) };
  const [total, rows] = await Promise.all([
    prisma.transferRequest.count({ where }),
    prisma.transferRequest.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  const requests = rows.map((r) => {
    const it = r.listing.inventoryItem;
    return {
      id: r.id, status: r.status, quantity: r.quantity, unitPrice: num(r.unitPrice), total: Math.round(Number(r.unitPrice) * r.quantity * 100) / 100,
      message: r.message, createdAt: r.createdAt, respondedAt: r.respondedAt, completedAt: r.completedAt,
      medicine: { name: it.medicine.name, strength: it.medicine.strength, dosageForm: it.medicine.dosageForm },
      batchNumber: it.batchNumber, expiryDate: it.expiryDate,
      partner: direction === 'incoming' ? r.requestingPharmacy : r.listing.pharmacy,
    };
  });
  res.json({ requests, pagination: pagination(page, pageSize, total) });
});

// Counts per direction, so a pharmacy's own transfers are never double counted.
router.get('/summary', async (req, res) => {
  const me = req.auth.pharmacyId;
  const [inc, out] = await Promise.all([
    prisma.transferRequest.groupBy({ by: ['status'], where: { listing: { pharmacyId: me } }, _count: { _all: true } }),
    prisma.transferRequest.groupBy({ by: ['status'], where: { requestingPharmacyId: me }, _count: { _all: true } }),
  ]);
  const fold = (g) => {
    const o = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    g.forEach((x) => (o[x.status] = x._count._all));
    return { ...o, total: Object.values(o).reduce((a, b) => a + b, 0) };
  };
  res.json({ incoming: fold(inc), outgoing: fold(out) });
});

router.get('/:id/events', async (req, res) => {
  const r = await prisma.transferRequest.findUnique({ where: { id: req.params.id }, include: { listing: { select: { pharmacyId: true } } } });
  const me = req.auth.pharmacyId;
  if (!r || (r.requestingPharmacyId !== me && r.listing.pharmacyId !== me)) throw new HttpError(404, 'Request not found.', 'NOT_FOUND');
  const events = await prisma.transferEvent.findMany({ where: { requestId: r.id }, orderBy: { createdAt: 'asc' } });
  const names = new Map((await prisma.pharmacy.findMany({ where: { id: { in: [r.requestingPharmacyId, r.listing.pharmacyId] } }, select: { id: true, name: true } })).map((p) => [p.id, p.name]));
  res.json({ events: events.map((e) => ({ ...e, actor: names.get(e.actorPharmacyId) || 'Unknown' })) });
});

const ACTIONS = {
  accept: { who: 'owner', from: ['PENDING'], to: 'ACCEPTED', event: 'ACCEPTED' },
  reject: { who: 'owner', from: ['PENDING', 'ACCEPTED'], to: 'REJECTED', event: 'REJECTED' },
  cancel: { who: 'requester', from: ['PENDING', 'ACCEPTED'], to: 'CANCELLED', event: 'CANCELLED' },
  complete: { who: 'requester', from: ['ACCEPTED'], to: 'COMPLETED', event: 'COMPLETED' },
};
const noteSchema = z.object({ note: z.preprocess(blank, z.string().trim().max(300).optional()) });

async function run(req, res, actionName) {
  const action = ACTIONS[actionName];
  const pre = await prisma.transferRequest.findUnique({ where: { id: req.params.id }, include: { listing: { select: { pharmacyId: true, inventoryItemId: true } } } });
  const me = req.auth.pharmacyId;
  const isOwner = pre && pre.listing.pharmacyId === me;
  const isRequester = pre && pre.requestingPharmacyId === me;
  if (!pre || (!isOwner && !isRequester)) throw new HttpError(404, 'Request not found.', 'NOT_FOUND');
  if ((action.who === 'owner' && !isOwner) || (action.who === 'requester' && !isRequester)) {
    throw new HttpError(403, action.who === 'owner' ? 'Only the pharmacy that listed this stock can do that.' : 'Only the requesting pharmacy can do that.', 'FORBIDDEN');
  }
  if (['accept', 'complete'].includes(actionName)) requireVerified(req, res, () => {});

  const result = await prisma.$transaction(async (tx) => {
    // Lock order is always listing, then item, so concurrent actions cannot deadlock.
    await lockListing(tx, pre.listingId);
    await lockItem(tx, pre.listing.inventoryItemId);
    const r = await tx.transferRequest.findUniqueOrThrow({ where: { id: pre.id } });
    const listing = await tx.transferListing.findUniqueOrThrow({ where: { id: pre.listingId } });
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: listing.inventoryItemId }, include: { medicine: true } });

    if (!action.from.includes(r.status)) throw new HttpError(409, `This request is already ${r.status.toLowerCase()}.`, 'BAD_STATE');
    const wasReserved = r.status === 'ACCEPTED';
    const now = new Date();
    const live = computeStatus(item);
    let l = { ...listing };
    let itemUpdate = null;

    if (actionName === 'accept') {
      if (listing.status === 'CANCELLED' || item.deletedAt) throw new HttpError(409, 'This listing is no longer open.', 'NOT_AVAILABLE');
      if (['EXPIRED', 'OUT_OF_STOCK'].includes(live)) throw new HttpError(409, 'This stock is expired or out of stock.', 'NOT_ELIGIBLE');
      if (r.quantity > listingRemaining(listing)) throw new HttpError(409, `Only ${listingRemaining(listing)} unit(s) are still unreserved on this listing.`, 'OVER_ALLOCATED');
      if (r.quantity > item.quantity - item.reservedQty) throw new HttpError(409, 'Not enough free stock to reserve.', 'OVER_ALLOCATED');
      l.reservedQty += r.quantity;
      itemUpdate = { reservedQty: { increment: r.quantity } };
    } else if (actionName === 'complete') {
      if (live === 'EXPIRED') throw new HttpError(409, 'This stock has expired. Cancel the transfer instead.', 'EXPIRED');
      const newQty = item.quantity - r.quantity;
      if (newQty < 0) throw new HttpError(409, 'The sender no longer has enough stock.', 'INSUFFICIENT_STOCK');
      l.reservedQty -= r.quantity;
      l.completedQty += r.quantity;
      itemUpdate = { quantity: newQty, reservedQty: { decrement: r.quantity }, status: computeStatus({ quantity: newQty, expiryDate: item.expiryDate }) };
      // Receiving pharmacy gets real stock with provenance, atomically with the deduction.
      const existing = await tx.inventoryItem.findFirst({
        where: { pharmacyId: r.requestingPharmacyId, medicineId: item.medicineId, batchNumber: item.batchNumber, expiryDate: item.expiryDate, deletedAt: null },
      });
      if (existing) {
        const bumped = await tx.inventoryItem.update({ where: { id: existing.id }, data: { quantity: { increment: r.quantity } } });
        await tx.inventoryItem.update({ where: { id: existing.id }, data: { status: computeStatus(bumped) } });
      } else {
        await tx.inventoryItem.create({
          data: {
            pharmacyId: r.requestingPharmacyId, medicineId: item.medicineId, quantity: r.quantity, costPrice: r.unitPrice, sellingPrice: item.sellingPrice,
            batchNumber: item.batchNumber, nafdacRegNo: item.nafdacRegNo, expiryDate: item.expiryDate,
            status: computeStatus({ quantity: r.quantity, expiryDate: item.expiryDate }), source: 'transfer', sourceRequestId: r.id, sourcePharmacyId: item.pharmacyId,
          },
        });
      }
    } else if (wasReserved) {
      // reject / cancel after acceptance releases the reservation
      l.reservedQty -= r.quantity;
      itemUpdate = { reservedQty: { decrement: r.quantity } };
    }

    if (itemUpdate) await tx.inventoryItem.update({ where: { id: item.id }, data: itemUpdate });
    if (l.reservedQty !== listing.reservedQty || l.completedQty !== listing.completedQty) {
      await tx.transferListing.update({ where: { id: listing.id }, data: { reservedQty: l.reservedQty, completedQty: l.completedQty, status: nextListingStatus(l) } });
    }
    const updated = await tx.transferRequest.update({
      where: { id: r.id },
      data: { status: action.to, respondedAt: actionName === 'complete' ? r.respondedAt : now, completedAt: actionName === 'complete' ? now : null },
    });
    await tx.transferEvent.create({
      data: { requestId: r.id, actorPharmacyId: me, actorUserId: req.auth.userId, type: action.event, fromStatus: r.status, toStatus: action.to, quantity: r.quantity, note: req.body.note },
    });
    return { updated, medicine: `${item.medicine.name} ${item.medicine.strength}`, ownerId: listing.pharmacyId };
  }, { timeout: 15000, maxWait: 10000 });

  // Notify the OTHER party after commit. Failures here never affect the transfer.
  const target = isOwner ? pre.requestingPharmacyId : result.ownerId;
  const verb = { accept: 'accepted', reject: 'declined', cancel: 'cancelled', complete: 'confirmed receipt of' }[actionName];
  const msg = actionName === 'complete'
    ? `${req.auth.pharmacyName} confirmed receipt of ${result.updated.quantity} × ${result.medicine}.`
    : actionName === 'cancel'
      ? `${req.auth.pharmacyName} cancelled their request for ${result.medicine}.`
      : `${req.auth.pharmacyName} ${verb} your request for ${result.updated.quantity} × ${result.medicine}.`;
  await safely('transfer-alert', () =>
    pushAlert({ pharmacyId: target, type: 'TRANSFER_UPDATE', severity: 'INFO', message: msg, link: '/transfer-requests', dedupeKey: `TRANSFER:${pre.id}:${action.to}` })
  );
  await safely('transfer-email', () => emailPharmacyAdmins(target, 'emailTransfer', { subject: 'Transfer update on PharmaCycle.AI', text: `${msg}\nLog in to see the details.` }));

  res.json({ id: result.updated.id, status: result.updated.status });
}

for (const name of Object.keys(ACTIONS)) {
  router.post(`/:id/${name}`, validate(noteSchema), (req, res) => run(req, res, name));
}

module.exports = router;
