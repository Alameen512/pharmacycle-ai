// Row locking + listing arithmetic shared by inventory and transfer routes.
const lockItem = (tx, id) => tx.$queryRaw`SELECT id FROM "InventoryItem" WHERE id = ${id} FOR UPDATE`;
const lockListing = (tx, id) => tx.$queryRaw`SELECT id FROM "TransferListing" WHERE id = ${id} FOR UPDATE`;

// Units of an item still promised to open listings (includes reserved units)
async function listedOpen(tx, itemId) {
  const rows = await tx.transferListing.findMany({
    where: { inventoryItemId: itemId, status: { in: ['AVAILABLE', 'PENDING'] } },
    select: { quantity: true, completedQty: true },
  });
  return rows.reduce((s, l) => s + l.quantity - l.completedQty, 0);
}

const listingRemaining = (l) => l.quantity - l.reservedQty - l.completedQty;

function nextListingStatus(l) {
  if (l.status === 'CANCELLED') return 'CANCELLED';
  if (listingRemaining(l) > 0) return 'AVAILABLE';
  return l.reservedQty > 0 ? 'PENDING' : 'COMPLETED';
}

const unitPrice = (sellingPrice, discountPercent) =>
  Math.round(Number(sellingPrice) * (1 - discountPercent / 100) * 100) / 100;

module.exports = { lockItem, lockListing, listedOpen, listingRemaining, nextListingStatus, unitPrice };
