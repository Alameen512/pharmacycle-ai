
const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { requirePharmacy } = require('../middleware/auth');
const { haversineKm } = require('../utils/geo');
const { pagination, num } = require('../utils/serialize');
const { todayLagosUtcMs, daysToExpiry } = require('../utils/status');
const { listingRemaining, unitPrice } = require('../lib/stock');

const router = express.Router();
router.use(requirePharmacy);

const blank = (v) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const q = z.object({
  search: z.preprocess(blank, z.string().trim().max(100).optional()),
  state: z.preprocess(blank, z.string().trim().max(80).optional()),
  lat: z.preprocess(blank, z.coerce.number().min(-90).max(90).optional()),
  lng: z.preprocess(blank, z.coerce.number().min(-180).max(180).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

const select = {
  id: true,
  name: true,
  address: true,
  city: true,
  state: true,
  phone: true,
  lat: true,
  lng: true,
  verifiedAt: true,
  logoUrl: true,
};

// Verified partner pharmacies, excluding the caller.
router.get('/', validate(q, 'query'), async (req, res) => {
  const { search, state, lat, lng, page, pageSize } = req.query;

  const where = {
    verificationStatus: 'VERIFIED',
    id: { not: req.auth.pharmacyId },
    ...(state
      ? { state: { equals: state, mode: 'insensitive' } }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const strip = ({ lat: a, lng: b, ...rest }) => rest;

  if (lat !== undefined && lng !== undefined) {
    const all = await prisma.pharmacy.findMany({
      where,
      select,
      take: 1000,
    });

    const withDist = all
      .map((p) => ({
        ...strip(p),
        verificationStatus: 'VERIFIED',
        distanceKm:
          p.lat != null && p.lng != null
            ? haversineKm(lat, lng, p.lat, p.lng)
            : null,
      }))
      .sort(
        (a, b) =>
          (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) ||
          a.name.localeCompare(b.name)
      );

    return res.json({
      pharmacies: withDist.slice(
        (page - 1) * pageSize,
        page * pageSize
      ),
      pagination: pagination(page, pageSize, withDist.length),
      sortedByDistance: true,
    });
  }

  const [total, rows] = await Promise.all([
    prisma.pharmacy.count({ where }),
    prisma.pharmacy.findMany({
      where,
      select,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    pharmacies: rows.map((p) => ({
      ...strip(p),
      verificationStatus: 'VERIFIED',
      distanceKm: null,
    })),
    pagination: pagination(page, pageSize, total),
    sortedByDistance: false,
  });
});

// Partner profile and its available marketplace stock.
router.get('/:id', async (req, res) => {
  const pharmacyId = req.params.id;

  // Fetch the exact pharmacy ID from the URL.
  const pharmacy = await prisma.pharmacy.findFirst({
    where: {
      id: pharmacyId,
      verificationStatus: 'VERIFIED',
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      phone: true,
      logoUrl: true,
      verifiedAt: true,
    },
  });

  if (!pharmacy || pharmacy.id === req.auth.pharmacyId) {
    throw new HttpError(
      404,
      'Partner pharmacy not found.',
      'NOT_FOUND'
    );
  }

  const pageQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
  });

  const { page, pageSize } = pageQuery.parse(req.query);

  const where = {
    pharmacyId: pharmacy.id,
    status: 'AVAILABLE',
    inventoryItem: {
      deletedAt: null,
      expiryDate: {
        gte: new Date(todayLagosUtcMs()),
      },
    },
  };

  const rows = await prisma.transferListing.findMany({
    where,
    include: {
      inventoryItem: {
        include: {
          medicine: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });

  // Only count and return listings with stock remaining.
  const availableListings = rows
    .map((listing) => {
      const item = listing.inventoryItem;

      return {
        id: listing.id,
        status: listing.status,
        quantity: listing.quantity,
        remaining: listingRemaining(listing),
        reservedQty: listing.reservedQty,
        completedQty: listing.completedQty,
        discountPercent: listing.discountPercent,
        originalPrice: num(item.sellingPrice),
        unitPrice: unitPrice(
          item.sellingPrice,
          listing.discountPercent
        ),
        createdAt: listing.createdAt,
        inventoryItemId: listing.inventoryItemId,
        medicine: {
          name: item.medicine.name,
          strength: item.medicine.strength,
          dosageForm: item.medicine.dosageForm,
          category: item.medicine.category,
        },
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        daysToExpiry: daysToExpiry(item.expiryDate),
        imageUrl: item.imageUrl || item.medicine.imageUrl,
      };
    })
    .filter((listing) => listing.remaining > 0);

  const total = availableListings.length;
  const start = (page - 1) * pageSize;
  const listings = availableListings.slice(start, start + pageSize);

  res.json({
    pharmacy,
    listings,
    pagination: pagination(page, pageSize, total),
  });
});

module.exports = router;
