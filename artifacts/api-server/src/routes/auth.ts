import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { db, usersTable, vendorsTable, riderProfilesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { generateToken, requireAuth, getUser } from "../lib/auth";

const router = Router();

const rateLimitMessage = (error: string) => ({ success: false, error, code: "RATE_LIMITED" });

// Auth rate limiting: protect against brute-force / abuse.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many login attempts. Please try again in 15 minutes."),
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === "development" ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many sign-up attempts. Please try again later."),
});

type VendorOnboarding = {
  businessName?: string;
  category?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  payoutMethod?: {
    type: "till" | "paybill" | "pochi" | "send_money";
    accountNumber: string;
    paybillAccountRef?: string;
  };
};

async function ensureVendorProfile(user: any, details?: VendorOnboarding) {
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.userId, user.id)).limit(1);
  if (vendor || user.role !== "vendor") {
    return vendor || null;
  }

  await db.insert(vendorsTable).values({
    userId: user.id,
    name: details?.businessName?.trim() || user.name,
    ownerName: user.name,
    category: (details?.category as any) || "food",
    address: details?.address || null,
    lat: details?.latitude ?? null,
    lng: details?.longitude ?? null,
    imageUrl: details?.imageUrl || null,
    payoutMethod: details?.payoutMethod || null,
    status: "pending_review",
  });

  const [created] = await db.select().from(vendorsTable).where(eq(vendorsTable.userId, user.id)).limit(1);
  return created || null;
}

async function ensureRiderProfile(user: any) {
  const [rider] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.userId, user.id)).limit(1);
  if (rider || user.role !== "rider") {
    return rider || null;
  }

  await db.insert(riderProfilesTable).values({
    userId: user.id,
    vehicleType: "motorcycle",
  });

  const [created] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.userId, user.id)).limit(1);
  return created || null;
}

const userSelect = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  passwordHash: usersTable.passwordHash,
  role: usersTable.role,
  phone: usersTable.phone,
  avatarUrl: usersTable.avatarUrl,
  address: usersTable.address,
  createdAt: usersTable.createdAt,
};

router.post("/auth/register", signupLimiter, async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const { name, email, password, role, phone, businessName, category, address, latitude, longitude, imageUrl, payoutMethod } = parsed.data;

  // Anti-fraud: phone is required for customer accounts
  if (role === "customer" && !phone) {
    res.status(400).json({ message: "Phone number is required" });
    return;
  }

  // Check email uniqueness
  const [existingEmail] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existingEmail) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }

  // Anti-fraud: check phone uniqueness (one account per phone number)
  if (phone) {
    const [existingPhone] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
    if (existingPhone) {
      res.status(409).json({ message: "A Yajja account already exists with this phone number. Each phone number can only be linked to one account." });
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(usersTable).values({ name, email, passwordHash, role: role as any, phone });
  const [user] = await db.select(userSelect).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(500).json({ message: "Failed to create user" });
    return;
  }

  console.log(`[AUTH REGISTER] Created user ID: ${user.id}, role: ${role}, email: ${email}`);

  // Create role-specific profiles
  if (role === "vendor") {
    await ensureVendorProfile(user, { businessName, category, address, latitude, longitude, imageUrl, payoutMethod: payoutMethod as any });
  } else if (role === "rider") {
    await ensureRiderProfile(user);
  }

  const token = generateToken(user.id);
  const { passwordHash: _, ...userOut } = user;
  res.status(201).json({ user: { ...userOut, createdAt: userOut.createdAt.toISOString() }, token });
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select(userSelect).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  await ensureVendorProfile(user);
  await ensureRiderProfile(user);

  const token = generateToken(user.id);
  const { passwordHash: _, ...userOut } = user;
  res.json({ user: { ...userOut, createdAt: userOut.createdAt.toISOString() }, token });
});

router.post("/auth/logout", (req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, (req, res) => {
  const user = getUser(req);
  void ensureVendorProfile(user);
  void ensureRiderProfile(user);
  const { passwordHash: _, ...userOut } = user;
  res.json({ ...userOut, createdAt: userOut.createdAt.toISOString() });
});

export default router;
