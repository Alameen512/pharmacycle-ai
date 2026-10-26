const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { requirePharmacy } = require('../middleware/auth');
const { pagination } = require('../utils/serialize');

const router = express.Router();
router.use(requirePharmacy);

const listQuery = z.object({
  unread: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
const TRANSFER = ['TRANSFER_REQUEST', 'TRANSFER_UPDATE'];

// Summary counts come from the database for ALL alerts, so they always agree with the list.
router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { unread, page, pageSize } = req.query;
  const pharmacyId = req.auth.pharmacyId;
  const where = { pharmacyId, ...(unread === 'true' ? { read: false } : {}) };
  const [total, alerts, all, unreadCount, urgent, transfer] = await Promise.all([
    prisma.alert.count({ where }),
    prisma.alert.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.alert.count({ where: { pharmacyId } }),
    prisma.alert.count({ where: { pharmacyId, read: false } }),
    prisma.alert.count({ where: { pharmacyId, read: false, severity: 'URGENT' } }),
    prisma.alert.count({ where: { pharmacyId, type: { in: TRANSFER } } }),
  ]);
  res.json({ alerts, summary: { total: all, unread: unreadCount, urgentUnread: urgent, transfer }, pagination: pagination(page, pageSize, total) });
});

router.post('/read-all', async (req, res) => {
  const r = await prisma.alert.updateMany({ where: { pharmacyId: req.auth.pharmacyId, read: false }, data: { read: true } });
  res.json({ updated: r.count });
});

router.patch('/:id/read', async (req, res) => {
  const r = await prisma.alert.updateMany({ where: { id: req.params.id, pharmacyId: req.auth.pharmacyId }, data: { read: true } });
  if (!r.count) throw new HttpError(404, 'Alert not found.', 'NOT_FOUND');
  res.json({ ok: true });
});

module.exports = router;
