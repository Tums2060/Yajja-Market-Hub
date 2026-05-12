import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendResetEmail(
  toEmail: string,
  toName: string,
  resetUrl: string,
  log: { info: (...args: any[]) => void; error: (...args: any[]) => void },
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  // Brevo requires the sender to be verified in the Brevo dashboard.
  // Allow the operator to set BREVO_SENDER_EMAIL / BREVO_SENDER_NAME, otherwise fall back.
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@yajja.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Yajja";

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail, name: toName }],
      subject: "Reset your Yajja password",
      htmlContent: `
        <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
          <div style="background: #1aabbb; padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Yajja</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Everything in order</p>
          </div>
          <div style="padding: 40px 32px; background: #ffffff;">
            <h2 style="color: #1a1a2e; font-size: 22px; font-weight: 700; margin: 0 0 12px;">Reset your password</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
              Hi ${toName}, we received a request to reset the password for your Yajja account.
              Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: #1aabbb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px;">
              Reset Password
            </a>
            <p style="color: #999; font-size: 13px; margin: 28px 0 0; line-height: 1.6;">
              If you didn't request this, you can safely ignore this email — your password won't change.
            </p>
          </div>
          <div style="padding: 20px 32px; background: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Yajja · Nairobi, Kenya</p>
          </div>
        </div>
      `,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    log.error({ status: response.status, body: bodyText, sender: senderEmail }, "Brevo API rejected reset email");
    throw new Error(`Brevo API error (${response.status}): ${bodyText}`);
  }
  log.info({ to: toEmail, sender: senderEmail, brevoResponse: bodyText }, "Brevo accepted reset email");
}

// POST /auth/forgot-password
router.post("/auth/forgot-password", async (req, res) => {
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
