import { Router } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { sendPasswordResetEmail } from "../lib/email";

const router = Router();

// Protect password reset from brute force/email spamming
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === "development" ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many password reset attempts. Please try again in an hour.", code: "RATE_LIMITED" },
});

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendResetEmail(
  toEmail: string,
  toName: string,
  resetUrl: string,
  log: { info: (...args: any[]) => void; error: (...args: any[]) => void },
): Promise<void> {
  try {
    await sendPasswordResetEmail(toEmail, toName, resetUrl);
    log.info({ to: toEmail }, "[RESET] Password reset email sent successfully via Nodemailer");
  } catch (err) {
    log.error({ err, to: toEmail }, "[RESET] Failed to send email via Nodemailer");
    throw err;
  }
}

// POST /auth/forgot-password
router.post("/auth/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ message: "Valid email address is required" });
    return;
  }

  // Always respond with success to prevent email enumeration
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.json({ message: "If that email exists, a reset link has been sent." });
    return;
  }

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db.insert(passwordResetTokensTable).values({
    userId: user.id,
    token,
    expiresAt,
  });

  // Build reset URL using REPLIT_DOMAINS (first domain) or fallback
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const host = domains.split(",")[0]?.trim();
  const baseUrl = host ? `https://${host}` : "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  try {
    await sendResetEmail(user.email, user.name, resetUrl, req.log);
  } catch (err) {
    req.log.error({ err }, "Failed to send reset email");
    res.status(500).json({ message: "Failed to send reset email. Please try again." });
    return;
  }

  res.json({ message: "If that email exists, a reset link has been sent." });
});

// POST /auth/reset-password
router.post("/auth/reset-password", async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token || typeof token !== "string") {
    res.status(400).json({ message: "Reset token is required" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters" });
    return;
  }

  const [resetRecord] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        gt(passwordResetTokensTable.expiresAt, new Date()),
        isNull(passwordResetTokensTable.usedAt),
      ),
    )
    .limit(1);

  if (!resetRecord) {
    res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Update password and mark token as used in a transaction
  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, resetRecord.userId));

    await tx
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, resetRecord.id));
  });

  res.json({ message: "Password reset successfully. You can now sign in with your new password." });
});

// GET /auth/verify-reset-token — lightweight check before showing the form
router.get("/auth/verify-reset-token", async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(400).json({ valid: false, message: "Token is required" });
    return;
  }

  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        gt(passwordResetTokensTable.expiresAt, new Date()),
        isNull(passwordResetTokensTable.usedAt),
      ),
    )
    .limit(1);

  if (!record) {
    res.status(400).json({ valid: false, message: "This reset link is invalid or has expired." });
    return;
  }

  res.json({ valid: true });
});

export default router;
