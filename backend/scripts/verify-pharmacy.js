// Operator tool: PharmaCycle.AI has no self-service verification, so a human checks the pharmacy
// (e.g. PCN premises licence) and then runs this.
//   npm run verify-pharmacy -- --list
//   npm run verify-pharmacy -- admin@pharmacy.com
//   npm run verify-pharmacy -- admin@pharmacy.com --reject
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    const rows = await prisma.pharmacy.findMany({ where: { verificationStatus: 'PENDING' }, include: { users: { select: { email: true } } }, orderBy: { createdAt: 'asc' } });
    if (!rows.length) console.log('No pharmacies are waiting for verification.');
    rows.forEach((p) => console.log(`${p.name} | ${p.city}, ${p.state} | ${p.users.map((u) => u.email).join(', ')}`));
    return;
  }
  const email = args.find((a) => !a.startsWith('--'));
  if (!email) throw new Error('Usage: npm run verify-pharmacy -- <admin-email> [--reject] | --list');
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error(`No user with email ${email}`);
  const reject = args.includes('--reject');
  await prisma.pharmacy.update({
    where: { id: user.pharmacyId },
    data: reject ? { verificationStatus: 'REJECTED', verifiedAt: null } : { verificationStatus: 'VERIFIED', verifiedAt: new Date() },
  });
  console.log(`${reject ? 'Rejected' : 'Verified'} pharmacy for ${email}.`);
})()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
