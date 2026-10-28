const { Resend } = require('resend');
const config = require('../config');
const prisma = require('./prisma');


const MAX_ATTEMPTS = 3;
let client = null;
const getClient = () => (client ||= new Resend(config.resend.apiKey));

async function attempt(id) {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.status === 'SENT') return n;
  try {
    const { error } = await getClient().emails.send({ from: config.resend.from, to: n.toEmail, subject: n.subject, text: n.body });
    if (error) throw new Error(error.message || 'Email provider rejected the message');
    return prisma.notification.update({ where: { id }, data: { status: 'SENT', attempts: { increment: 1 }, sentAt: new Date(), lastError: null } });
  } catch (e) {
    return prisma.notification.update({ where: { id }, data: { status: 'FAILED', attempts: { increment: 1 }, lastError: String(e.message || e).slice(0, 500) } });
  }
}

// Records the notification honestly: SKIPPED when email is not configured, SENT/FAILED otherwise.
async function deliver({ recipientId, pharmacyId, toEmail, subject, body, recipientType = 'USER' }) {
  const configured = Boolean(config.resend.apiKey);
  const rec = await prisma.notification.create({
    data: {
      recipientType, recipientId, pharmacyId, toEmail, subject, body,
      status: configured ? 'PENDING' : 'SKIPPED',
      lastError: configured ? null : 'Email delivery is not configured (RESEND_API_KEY missing).',
    },
  });
  return configured ? attempt(rec.id) : rec;
}

// pref = name of a boolean preference on Pharmacy (e.g. 'emailTransfer')
async function emailPharmacyAdmins(pharmacyId, pref, { subject, text }) {
  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId }, select: { [pref]: true } });
  if (!pharmacy || !pharmacy[pref]) return;
  const admins = await prisma.user.findMany({ where: { pharmacyId, role: 'ADMIN' }, select: { id: true, email: true } });
  for (const a of admins) await deliver({ recipientId: a.id, pharmacyId, toEmail: a.email, subject, body: text });
}

async function retryFailed() {
  if (!config.resend.apiKey) return 0;
  const rows = await prisma.notification.findMany({
    where: { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS }, updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
    take: 50,
    select: { id: true },
  });
  for (const r of rows) await attempt(r.id);
  return rows.length;
}

module.exports = { deliver, emailPharmacyAdmins, retryFailed };
