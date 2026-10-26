const { PrismaClient } = require('@prisma/client');

const g = globalThis;
const prisma = g.__pharmacyclePrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.__pharmacyclePrisma = prisma;

module.exports = prisma;
