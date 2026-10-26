const { daysToExpiry } = require('./status');

const num = (d) => (d === null || d === undefined ? null : Number(d));

function serializeItem(item) {
  return {
    ...item,
    costPrice: num(item.costPrice),
    sellingPrice: num(item.sellingPrice),
    availableQty: item.quantity - item.reservedQty,
    daysToExpiry: daysToExpiry(item.expiryDate),
  };
}

function pagination(page, pageSize, total) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

module.exports = { num, serializeItem, pagination };
