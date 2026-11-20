
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { Resend } = require('resend');

const prisma = require('../lib/prisma');
const config = require('../config');
const HttpError = require('../utils/httpError');

const router = express.Router();

const resend = config.resend.apiKey
  ? new Resend(config.resend.apiKey)
  : null;

const GENERIC_RESPONSE = {
  message:
    'If an account matches those details and email delivery is available, password reset instructions will be sent.',
};

const accountTypes = {
  pharmacy: 'USER',
  consumer: 'CONSUMER',
};

const requestSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  accountType: z.enum(['pharmacy', 'consumer']),
});

const confirmSchema = z.object({
  token: z.string().min(20).max(200),
  accountType: z.enum(['pharmacy', 'consumer']),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must not exceed 72 characters.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
});

function getFrontendOrigin(req) {
  const requestOrigin = req.get('origin');

  if (requestOrigin && config.clientOrigins.includes(requestOrigin.replace(/\/$/, ''))) {
    return requestOrigin.replace(/\/$/, '');
  }

  return config.clientOrigins[0];
}

// POST /password-reset/request
router.post('/request', async (req, res) => {
  const { email, accountType } = requestSchema.parse(req.body);

  // Do not reveal whether an account exists or whether email is configured.
  if (!resend) {
    return res.json(GENERIC_RESPONSE);
  }

  const dbAccountType = accountTypes[accountType];

  const account =
    dbAccountType === 'USER'
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        })
      : await prisma.consumer.findUnique({
          where: { email },
          select: { id: true, email: true },
        });

  if (!account) {
    return res.json(GENERIC_RESPONSE);
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const resetToken = await prisma.passwordResetToken.create({
    data: {
      accountType: dbAccountType,
      accountId: account.id,
      tokenHash,
      expiresAt,
    },
  });

  const origin = getFrontendOrigin(req);
  const role = accountType;
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}&type=${role}`;

  try {
    const result = await resend.emails.send({
      from: config.resend.from,
      to: account.email,
      subject: 'Reset your PharmaCycle.AI password',
      text: [
        'We received a request to reset your PharmaCycle.AI password.',
        '',
        `Use this link to choose a new password: ${resetUrl}`,
        '',
        'This link expires in 30 minutes and can only be used once.',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;line-height:1.6">
          <h2 style="color:#047857">Reset your password</h2>
          <p>We received a request to reset your PharmaCycle.AI password.</p>
          <p>Click the button below to choose a new password.</p>
          <p style="margin:28px 0">
            <a href="${resetUrl}" style="background:#047857;color:#fff;text-decoration:none;padding:13px 22px;border-radius:8px;display:inline-block;font-weight:bold">
              Reset password
            </a>
          </p>
          <p>This link expires in 30 minutes and can only be used once.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <p style="color:#6b7280;font-size:12px">PharmaCycle.AI</p>
        </div>
      `,
    });

    if (result?.error) {
      throw new Error(result.error.message || 'Email delivery failed.');
    }

    // Invalidate older reset links only after the new email was accepted.
    await prisma.passwordResetToken.deleteMany({
      where: {
        accountType: dbAccountType,
        accountId: account.id,
        id: { not: resetToken.id },
      },
    });
  } catch (error) {
    // Remove the newly created token if delivery failed.
    await prisma.passwordResetToken.deleteMany({
      where: { id: resetToken.id },
    });

    console.error(
      '[password-reset] Email delivery failed:',
      error.message || 'Unknown email error'
    );
  }

  return res.json(GENERIC_RESPONSE);
});

// POST /password-reset/confirm
router.post('/confirm', async (req, res) => {
  const { token, accountType, password } = confirmSchema.parse(req.body);

  const dbAccountType = accountTypes[accountType];

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (
    !resetRecord ||
    resetRecord.accountType !== dbAccountType ||
    resetRecord.usedAt ||
    resetRecord.expiresAt <= new Date()
  ) {
    throw new HttpError(400, 'This password reset link is invalid or has expired.', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Atomically claim the token so concurrent requests cannot reuse it.
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        id: resetRecord.id,
        accountType: dbAccountType,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (claimed.count !== 1) {
      throw new HttpError(
        400,
        'This password reset link is invalid or has expired.',
        'INVALID_RESET_TOKEN'
      );
    }

    const updated =
      dbAccountType === 'USER'
        ? await tx.user.updateMany({
            where: { id: resetRecord.accountId },
            data: { passwordHash },
          })
        : await tx.consumer.updateMany({
            where: { id: resetRecord.accountId },
            data: { passwordHash },
          });

    if (updated.count !== 1) {
      throw new HttpError(
        400,
        'This password reset link is invalid or has expired.',
        'INVALID_RESET_TOKEN'
      );
    }

    // A successful reset invalidates every other outstanding link.
    await tx.passwordResetToken.deleteMany({
      where: {
        accountType: dbAccountType,
        accountId: resetRecord.accountId,
      },
    });
  });

  return res.json({
    message: 'Your password has been reset successfully. You can now sign in.',
  });
});

module.exports = router;
