const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { requirePharmacy } = require('../middleware/auth');
const { computeStatus, parseDateOnly } = require('../utils/status');
const { serializeItem, pagination } = require('../utils/serialize');
const { lockItem, listedOpen } = require('../lib/stock');
const { uploadImage } = require('../lib/cloudinary');
const ocr = require('../lib/ocr');

const router = express.Router();
router.use(requirePharmacy);

const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Other'];
const STATUSES = ['HEALTHY', 'LOW_STOCK', 'NEAR_EXPIRY', 'OUT_OF_STOCK', 'EXPIRED'];
const blankToUndef = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const blankToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.')
  .refine((s) => !Number.isNaN(parseDateOnly(s).getTime()) && parseDateOnly(s).toISOString().slice(0, 10) === s, 'Enter a real calendar date.')
  .refine((s) => s >= '2000-01-01' && s <= `${new Date().getUTCFullYear() + 15}-12-31`, 'Expiry date is out of the allowed range.');

const base = z.object({
  name: z.string().trim().min(2, 'Enter the medicine name.').max(120),
  category: z.string().trim().min(2, 'Enter a category.').max(60),
  dosageForm: z.enum(FORMS, { error: 'Choose a dosage form.' }),
  strength: z.string().trim().min(1, 'Enter the strength, e.g. 500mg.').max(40),
  batchNumber: z.string().trim().min(1, 'Enter the batch number.').max(60),
  nafdacRegNo: z.preprocess(blankToNull, z.string().trim().max(40).nullable().optional()),
  quantity: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.coerce.number({ error: 'Enter a quantity.' }).int('Whole units only.').min(0, 'Cannot be negative.').max(1_000_000)),
  costPrice: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.coerce.number({ error: 'Enter a cost price.' }).min(0, 'Cannot be negative.').max(1e9)),
  sellingPrice: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.coerce.number({ error: 'Enter a selling price.' }).min(0, 'Cannot be negative.').max(1e9)),
  expiryDate: dateStr,
  source: z.enum(['manual', 'scan']).optional(),
});
const createSchema = base;
const updateSchema = base.omit({ source: true }).partial().refine((o) => Object.keys(o).length > 0, 'Nothing to update.');

const listQuery = z.object({
  search: z.preprocess(blankToUndef, z.string().trim().max(100).optional()),
  status: z.preprocess(blankToUndef, z.enum(STATUSES).optional()),
  source: z.preprocess(blankToUndef, z.enum(['manual', 'scan', 'transfer']).optional()),
  eligible: z.preprocess(blankToUndef, z.enum(['true', 'false']).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

const include = { medicine: true };

async function findOrCreateMedicine(tx, { name, category, dosageForm, strength }) {
  const where = { name: { equals: name, mode: 'insensitive' }, strength: { equals: strength, mode: 'insensitive' }, dosageForm };
  const found = await tx.medicine.findFirst({ where });
  if (found) return found;
  try {
    return await tx.medicine.create({ data: { name, category, dosageForm, strength } });
  } catch (e) {
    if (e.code !== 'P2002') throw e;
    return tx.medicine.findFirstOrThrow({ where });
  }
}

async function ownItem(client, req) {
  const item = await client.inventoryItem.findFirst({ where: { id: req.params.id, pharmacyId: req.auth.pharmacyId, deletedAt: null } });
  if (!item) throw new HttpError(404, 'Inventory item not found.', 'NOT_FOUND');
  return item;
}

router.get('/', validate(listQuery, 'query'), async (req, res) => {
  const { search, status, source, eligible, page, pageSize } = req.query;
  const where = { pharmacyId: req.auth.pharmacyId, deletedAt: null };
  if (status) where.status = status;
  if (source) where.source = source;
  if (eligible === 'true') {
    where.status = { in: ['HEALTHY', 'LOW_STOCK', 'NEAR_EXPIRY'] };
    where.quantity = { gt: 0 };
  }
  if (search) {
    where.OR = [
      { medicine: { name: { contains: search, mode: 'insensitive' } } },
      { batchNumber: { contains: search, mode: 'insensitive' } },
      { nafdacRegNo: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json({ items: items.map(serializeItem), pagination: pagination(page, pageSize, total) });
});

router.get('/stats', async (req, res) => {
  const pharmacyId = req.auth.pharmacyId;
  const grouped = await prisma.inventoryItem.groupBy({ by: ['status'], where: { pharmacyId, deletedAt: null }, _count: { _all: true } });
  const c = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  grouped.forEach((g) => (c[g.status] = g._count._all));
  res.json({ total: Object.values(c).reduce((a, b) => a + b, 0), lowStock: c.LOW_STOCK, nearExpiry: c.NEAR_EXPIRY, expired: c.EXPIRED, outOfStock: c.OUT_OF_STOCK });
});

// Looks a scanned code up against identifiers THIS pharmacy has stored. It is not a NAFDAC registry check.
router.get('/lookup', validate(z.object({ code: z.string().trim().min(1).max(80) }), 'query'), async (req, res) => {
  const items = await prisma.inventoryItem.findMany({
    where: {
      pharmacyId: req.auth.pharmacyId, deletedAt: null,
      OR: [{ batchNumber: { equals: req.query.code, mode: 'insensitive' } }, { nafdacRegNo: { equals: req.query.code, mode: 'insensitive' } }],
    },
    include, take: 10,
  });
  res.json({ items: items.map(serializeItem) });
});

const ocrSchema = z.object({
  image: z.string().min(100).max(3_800_000, 'Image is too large. Retake it at a lower resolution.').regex(/^[A-Za-z0-9+/=]+$/, 'Send the image as plain base64 without a data: prefix.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
router.post('/ocr', validate(ocrSchema), async (req, res) => {
  const fields = await ocr.extractLabel(req.body);
  res.json({ fields, source: 'gemini' });
});

router.post('/', validate(createSchema), async (req, res) => {
  const b = req.body;
  const item = await prisma.$transaction(async (tx) => {
    const medicine = await findOrCreateMedicine(tx, b);
    const dup = await tx.inventoryItem.findFirst({
      where: { pharmacyId: req.auth.pharmacyId, medicineId: medicine.id, batchNumber: { equals: b.batchNumber, mode: 'insensitive' }, expiryDate: parseDateOnly(b.expiryDate), deletedAt: null },
      select: { id: true },
    });
    if (dup) throw new HttpError(409, 'This batch is already in your inventory. Edit it instead of adding it again.', 'DUPLICATE_BATCH');
    return tx.inventoryItem.create({
      data: {
        pharmacyId: req.auth.pharmacyId, medicineId: medicine.id, quantity: b.quantity, costPrice: b.costPrice, sellingPrice: b.sellingPrice,
        batchNumber: b.batchNumber, nafdacRegNo: b.nafdacRegNo, expiryDate: parseDateOnly(b.expiryDate), source: b.source || 'manual',
        status: computeStatus({ quantity: b.quantity, expiryDate: parseDateOnly(b.expiryDate) }),
      },
      include,
    });
  });
  res.status(201).json(serializeItem(item));
});

router.get('/:id', async (req, res) => {
  const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, pharmacyId: req.auth.pharmacyId, deletedAt: null }, include });
  if (!item) throw new HttpError(404, 'Inventory item not found.', 'NOT_FOUND');
  res.json(serializeItem(item));
});

router.patch('/:id', validate(updateSchema), async (req, res) => {
  const b = req.body;
  const updated = await prisma.$transaction(async (tx) => {
    await lockItem(tx, req.params.id);
    const item = await ownItem(tx, req);
    const open = await listedOpen(tx, item.id);
    const hasListings = open > 0 || item.reservedQty > 0;

    const quantity = b.quantity ?? item.quantity;
    const expiryDate = b.expiryDate ? parseDateOnly(b.expiryDate) : item.expiryDate;
    if (quantity < open) throw new HttpError(409, `${open} unit(s) are promised to transfer listings. Cancel or reduce those listings first.`, 'LISTED_STOCK');
    if (hasListings && ((b.expiryDate && b.expiryDate !== item.expiryDate.toISOString().slice(0, 10)) || (b.batchNumber && b.batchNumber !== item.batchNumber))) {
      throw new HttpError(409, 'Batch and expiry cannot change while this item has open transfer listings.', 'LISTED_STOCK');
    }
    const data = { quantity, expiryDate, status: computeStatus({ quantity, expiryDate }) };
    for (const k of ['batchNumber', 'nafdacRegNo', 'costPrice', 'sellingPrice']) if (b[k] !== undefined) data[k] = b[k];
    if (b.name || b.category || b.dosageForm || b.strength) {
      const cur = await tx.medicine.findUniqueOrThrow({ where: { id: item.medicineId } });
      const med = await findOrCreateMedicine(tx, {
        name: b.name ?? cur.name, category: b.category ?? cur.category, dosageForm: b.dosageForm ?? cur.dosageForm, strength: b.strength ?? cur.strength,
      });
      data.medicineId = med.id;
    }
    return tx.inventoryItem.update({ where: { id: item.id }, data, include });
  });
  res.json(serializeItem(updated));
});

router.delete('/:id', async (req, res) => {
  await prisma.$transaction(async (tx) => {
    await lockItem(tx, req.params.id);
    const item = await ownItem(tx, req);
    if ((await listedOpen(tx, item.id)) > 0 || item.reservedQty > 0) {
      throw new HttpError(409, 'This item has open transfer listings. Cancel them before deleting.', 'LISTED_STOCK');
    }
    // Soft delete keeps transfer history and audit records intact.
    await tx.inventoryItem.update({ where: { id: item.id }, data: { deletedAt: new Date() } });
  });
  res.status(204).end();
});

const saleSchema = z.object({
  quantity: z.coerce.number().int('Whole units only.').min(1, 'Enter at least 1.').max(1_000_000),
  date: z.preprocess(blankToUndef, dateStr.optional()),
});
router.post('/:id/sale', validate(saleSchema), async (req, res) => {
  const updated = await prisma.$transaction(async (tx) => {
    await lockItem(tx, req.params.id);
    const item = await ownItem(tx, req);
    if (item.status === 'EXPIRED') throw new HttpError(409, 'Expired stock cannot be sold. Edit the quantity to write it off.', 'EXPIRED');
    const open = await listedOpen(tx, item.id);
    const remaining = item.quantity - req.body.quantity;
    if (remaining < 0) throw new HttpError(409, `Only ${item.quantity} unit(s) in stock.`, 'INSUFFICIENT_STOCK');
    if (remaining < open) throw new HttpError(409, `${open} unit(s) are promised to transfer listings. Cancel or reduce those listings first.`, 'LISTED_STOCK');
    await tx.salesRecord.create({
      data: { pharmacyId: item.pharmacyId, medicineId: item.medicineId, quantitySold: req.body.quantity, date: req.body.date ? parseDateOnly(req.body.date) : new Date() },
    });
    return tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: remaining, status: computeStatus({ quantity: remaining, expiryDate: item.expiryDate }) }, include });
  });
  res.status(201).json(serializeItem(updated));
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new HttpError(415, 'Only JPEG, PNG or WebP images are allowed.', 'BAD_FILE_TYPE'))),
});
router.post('/:id/image', upload.single('image'), async (req, res) => {
  const item = await ownItem(prisma, req);
  if (!req.file) throw new HttpError(400, 'Attach an image file in the "image" field.', 'NO_FILE');
  const url = await uploadImage(req.file.buffer, 'inventory');
  res.json(serializeItem(await prisma.inventoryItem.update({ where: { id: item.id }, data: { imageUrl: url }, include })));
});

module.exports = router;
