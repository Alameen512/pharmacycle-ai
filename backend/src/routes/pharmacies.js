
const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const HttpError = require('../utils/httpError');
const validate = require('../middleware/validate');
const { requirePharmacy } = require('../middleware/auth');
const { haversineKm } = require('../utils/geo');
const { pagination, num } = require('../utils/serialize');
const { todayLagosUtcMs, daysToExpiry, computeStatus } = require('../utils/status');
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

router.get('/', validate(q, 'query'), async (req, res) => {
  const { search, state, lat, lng, page, pageSize } = req.query;

  const where = {
    verificationStatus: 'VERIFIED',
    id: { not: req.auth.pharmacyId },
    ...(state ? { state: { equals: state, mode: 'insensitive' } } : {}),
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
      pharmacies: withDist.slice((page - 1) * pageSize, page * pageSize),
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

// Partner profile, inventory overview and available marketplace stock.
router.get('/:id', async (req, res) => {
  const pharmacyId = req.params.id;

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
    throw new HttpError(404, 'Partner pharmacy not found.', 'NOT_FOUND');
  }

  const pageQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
    inventoryPage: z.coerce.number().int().min(1).default(1),
    inventoryPageSize: z.coerce.number().int().min(1).max(50).default(12),
    status: z.enum([
      'ALL',
      'HEALTHY',
      'LOW_STOCK',
      'NEAR_EXPIRY',
      'OUT_OF_STOCK',
      'EXPIRED',
    ]).default('ALL'),
    search: z.preprocess(blank, z.string().trim().max(100).optional()),
  });

  const {
    page,
    pageSize,
    inventoryPage,
    inventoryPageSize,
    status,
    search,
  } = pageQuery.parse(req.query);

  const today = new Date(todayLagosUtcMs());

  const [rows, listingRows] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: {
        pharmacyId: pharmacy.id,
        deletedAt: null,
      },
      include: {
        medicine: true,
        transferListings: {
          where: {
            status: { in: ['AVAILABLE', 'PENDING'] },
          },
          select: {
            id: true,
            quantity: true,
            reservedQty: true,
            completedQty: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),

    prisma.transferListing.findMany({
      where: {
        pharmacyId: pharmacy.id,
        status: 'AVAILABLE',
        inventoryItem: {
          deletedAt: null,
          expiryDate: { gte: today },
        },
      },
      include: {
        inventoryItem: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
  ]);

  const inventory = rows.map((item) => {
    const stockStatus = computeStatus({
      quantity: item.quantity,
      expiryDate: item.expiryDate,
    });

    const listedQuantity = item.transferListings.reduce(
      (sum, listing) =>
        sum + listing.quantity - listing.completedQty,
      0
    );

    return {
      id: item.id,
      medicine: {
        name: item.medicine.name,
        strength: item.medicine.strength,
        dosageForm: item.medicine.dosageForm,
        category: item.medicine.category,
        imageUrl: item.imageUrl || item.medicine.imageUrl,
      },
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      reservedQty: item.reservedQty,
      availableQuantity: Math.max(0, item.quantity - item.reservedQty),
      expiryDate: item.expiryDate,
      daysToExpiry: daysToExpiry(item.expiryDate),
      status: stockStatus,
      listedForTransfer: listedQuantity > 0,
      listedQuantity,
    };
  });

  const summary = {
    totalBatches: inventory.length,
    totalUnits: inventory.reduce((sum, item) => sum + item.quantity, 0),
    availableUnits: inventory.reduce(
      (sum, item) => sum + item.availableQuantity,
      0
    ),
    listedBatches: inventory.filter((item) => item.listedForTransfer).length,
    healthy: 0,
    lowStock: 0,
    nearExpiry: 0,
    outOfStock: 0,
    expired: 0,
  };

  const statusKeys = {
    HEALTHY: 'healthy',
    LOW_STOCK: 'lowStock',
    NEAR_EXPIRY: 'nearExpiry',
    OUT_OF_STOCK: 'outOfStock',
    EXPIRED: 'expired',
  };

  inventory.forEach((item) => {
    summary[statusKeys[item.status]] += 1;
  });

  const filteredInventory = inventory.filter((item) => {
    const matchesStatus = status === 'ALL' || item.status === status;
    const term = search?.toLowerCase();

    const matchesSearch =
      !term ||
      item.medicine.name.toLowerCase().includes(term) ||
      item.medicine.strength.toLowerCase().includes(term) ||
      item.batchNumber.toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  const inventoryTotal = filteredInventory.length;
  const inventoryStart = (inventoryPage - 1) * inventoryPageSize;

  const inventoryItems = filteredInventory.slice(
    inventoryStart,
    inventoryStart + inventoryPageSize
  );

  const availableListings = listingRows
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

  const totalListings = availableListings.length;
  const listingStart = (page - 1) * pageSize;

  res.json({
    pharmacy,
    summary,
    inventory: inventoryItems,
    inventoryPagination: pagination(
      inventoryPage,
      inventoryPageSize,
      inventoryTotal
    ),
    listings: availableListings.slice(
      listingStart,
      listingStart + pageSize
    ),
    pagination: pagination(page, pageSize, totalListings),
  });
});

module.exports = router;
