// Demo data. DESTRUCTIVE: wipes every table first. Run with: npm run seed -- --yes
// All names, batch numbers and "NAFDAC" values below are fictional demo data, not real registrations.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { computeStatus } = require('../src/utils/status');

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'password123';

let seedState = 20260101;
const rand = () => ((seedState = (seedState * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const daysFromNow = (n) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
};

const PHARMACIES = [
  { key: 'greenlife', name: 'Greenlife Pharmacy', city: 'Ikeja', state: 'Lagos', address: '12 Allen Avenue', lat: 6.6018, lng: 3.3515, phone: '+234 801 000 0001' },
  { key: 'lifecare', name: 'Lifecare Pharmacy', city: 'Lekki', state: 'Lagos', address: '5 Admiralty Way', lat: 6.4474, lng: 3.47, phone: '+234 801 000 0002' },
  { key: 'medplus', name: 'MedPlus Pharmacy', city: 'Abuja', state: 'FCT', address: '27 Adetokunbo Ademola Crescent, Wuse 2', lat: 9.0765, lng: 7.3986, phone: '+234 801 000 0003' },
  { key: 'healthplus', name: 'HealthPlus Pharmacy', city: 'Ibadan', state: 'Oyo', address: '8 Ring Road', lat: 7.3775, lng: 3.947, phone: '+234 801 000 0004' },
  { key: 'citycare', name: 'CityCare Pharmacy', city: 'Port Harcourt', state: 'Rivers', address: '3 Aba Road', lat: 4.8156, lng: 7.0498, phone: '+234 801 000 0005' },
  { key: 'trustpharm', name: 'TrustPharm', city: 'Kano', state: 'Kano', address: '14 Zoo Road', lat: 12.0022, lng: 8.592, phone: '+234 801 000 0006' },
];

const MEDS = [
  ['Amoxicillin', 'Antibiotic', 'Capsule', '500mg', 450, 700],
  ['Paracetamol', 'Analgesic', 'Tablet', '500mg', 120, 200],
  ['Artemether/Lumefantrine', 'Antimalarial', 'Tablet', '80/480mg', 1100, 1800],
  ['Ibuprofen', 'Analgesic', 'Tablet', '400mg', 180, 300],
  ['Metformin', 'Antidiabetic', 'Tablet', '500mg', 250, 420],
  ['Amlodipine', 'Antihypertensive', 'Tablet', '5mg', 300, 480],
  ['Ciprofloxacin', 'Antibiotic', 'Tablet', '500mg', 400, 650],
  ['Vitamin C', 'Supplement', 'Tablet', '1000mg', 200, 350],
  ['Cetirizine', 'Antihistamine', 'Tablet', '10mg', 150, 260],
  ['Omeprazole', 'Gastrointestinal', 'Capsule', '20mg', 280, 450],
  ['Metronidazole', 'Antibiotic', 'Tablet', '400mg', 160, 280],
  ['Salbutamol', 'Respiratory', 'Inhaler', '100mcg', 1200, 1900],
  ['Diclofenac', 'Analgesic', 'Cream', '1%', 600, 950],
  ['Azithromycin', 'Antibiotic', 'Tablet', '500mg', 900, 1400],
];
const EXPIRY_OFFSETS = [-20, 6, 12, 25, 45, 90, 200, 400, 600];

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production.');
  if (!process.argv.includes('--yes')) {
    throw new Error('Seeding DELETES ALL DATA in the database from DATABASE_URL. Re-run with:  npm run seed -- --yes');
  }
  console.log('Clearing existing data...');
  for (const m of ['notification', 'alert', 'aIInsight', 'salesRecord', 'transferEvent', 'transferRequest', 'transferListing', 'inventoryItem', 'medicine', 'user', 'consumer', 'pharmacy']) {
    await prisma[m].deleteMany();
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const medicines = [];
  for (const [name, category, dosageForm, strength] of MEDS) medicines.push(await prisma.medicine.create({ data: { name, category, dosageForm, strength } }));

  const pharmacies = [];
  for (const p of PHARMACIES) {
    const { key, ...data } = p;
    pharmacies.push(
      await prisma.pharmacy.create({
        data: { ...data, verificationStatus: 'VERIFIED', verifiedAt: new Date(), users: { create: { name: `${p.name} Admin`, email: `${key}@demo.test`, passwordHash: hash, role: 'ADMIN' } } },
      })
    );
  }
  await prisma.pharmacy.create({
    data: { name: 'Newleaf Pharmacy', city: 'Enugu', state: 'Enugu', address: '2 Ogui Road', verificationStatus: 'PENDING', users: { create: { name: 'Newleaf Admin', email: 'pending@demo.test', passwordHash: hash, role: 'ADMIN' } } },
  });
  await prisma.consumer.createMany({
    data: [
      { name: 'Chidinma Okafor', email: 'chidinma@demo.test', passwordHash: hash, city: 'Ikeja', state: 'Lagos' },
      { name: 'Tunde Bakare', email: 'tunde@demo.test', passwordHash: hash, city: 'Ibadan', state: 'Oyo' },
    ],
  });

  const itemsByPharmacy = [];
  for (let pi = 0; pi < pharmacies.length; pi++) {
    const chosen = [...medicines.keys()].sort(() => rand() - 0.5).slice(0, 10);
    const created = [];
    for (const mi of chosen) {
      const [, , , , cost, sell] = MEDS[mi];
      const quantity = pick([0, 18, 35, 60, 120, 240, 500]);
      const expiryDate = daysFromNow(pick(EXPIRY_OFFSETS));
      created.push(
        await prisma.inventoryItem.create({
          data: {
            pharmacyId: pharmacies[pi].id, medicineId: medicines[mi].id, quantity, costPrice: cost, sellingPrice: sell,
            batchNumber: `B${pi + 1}${String(mi).padStart(2, '0')}-${2400 + Math.floor(rand() * 600)}`,
            nafdacRegNo: `DEMO-A4-${1000 + Math.floor(rand() * 8999)}`, expiryDate, status: computeStatus({ quantity, expiryDate }),
          },
        })
      );
    }
    itemsByPharmacy.push(created);
  }

  // Listings from pharmacies 2..5 for in-date stock
  const listings = [];
  for (let pi = 1; pi < 5; pi++) {
    const eligible = itemsByPharmacy[pi].filter((i) => ['HEALTHY', 'NEAR_EXPIRY', 'LOW_STOCK'].includes(i.status) && i.quantity >= 20).slice(0, 3);
    for (const it of eligible) {
      listings.push(await prisma.transferListing.create({ data: { inventoryItemId: it.id, pharmacyId: pharmacies[pi].id, quantity: Math.floor(it.quantity / 2), discountPercent: pick([15, 25, 40]) } }));
    }
  }
  if (listings[0]) {
    const l = listings[0];
    const r = await prisma.transferRequest.create({ data: { listingId: l.id, requestingPharmacyId: pharmacies[0].id, quantity: Math.min(10, l.quantity), unitPrice: 100, message: 'Demo request from Greenlife.' } });
    await prisma.transferEvent.create({ data: { requestId: r.id, actorPharmacyId: pharmacies[0].id, type: 'REQUESTED', toStatus: 'PENDING', quantity: r.quantity } });
  }

  // 90 days of sales for the first two pharmacies so forecasts have something real to work with
  for (let pi = 0; pi < 2; pi++) {
    const rows = [];
    for (let d = 1; d <= 90; d++) {
      for (const it of itemsByPharmacy[pi].slice(0, 6)) {
        if (rand() < 0.55) rows.push({ pharmacyId: pharmacies[pi].id, medicineId: it.medicineId, quantitySold: 1 + Math.floor(rand() * 8), date: daysFromNow(-d) });
      }
    }
    await prisma.salesRecord.createMany({ data: rows });
  }

  const { runMaintenance } = require('../src/jobs/maintenance');
  console.log('Generating alerts...', await runMaintenance());
  console.log(`\nSeed complete. Demo logins (password for all: ${DEMO_PASSWORD})`);
  PHARMACIES.forEach((p) => console.log(`  pharmacy  ${p.key}@demo.test`));
  console.log('  pharmacy  pending@demo.test  (unverified)\n  consumer  chidinma@demo.test, tunde@demo.test');
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
