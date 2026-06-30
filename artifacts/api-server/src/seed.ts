import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  console.log("[SEED] Starting database seeding...");
  const adminEmail = "tumainiwamukota@gmail.com";
  const plainPassword = "t12@mainiV";

  try {
    // Check if the user already exists
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, adminEmail))
      .limit(1);

    if (existing) {
      console.log(`[SEED] User ${adminEmail} already exists. Ensuring super_admin role...`);
      await db
        .update(usersTable)
        .set({
          role: "super_admin",
          isActive: true,
        })
        .where(eq(usersTable.email, adminEmail));
      console.log("[SEED] Super Admin user updated successfully.");
    } else {
      console.log(`[SEED] Creating new Super Admin user: ${adminEmail}...`);
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      await db.insert(usersTable).values({
        name: "Super Admin",
        email: adminEmail,
        passwordHash,
        role: "super_admin",
        isActive: true,
      });
      console.log("[SEED] Super Admin user created successfully.");
    }
  } catch (err) {
    console.error("[SEED] Database seeding failed:", err);
    process.exit(1);
  }
  console.log("[SEED] Seeding completed successfully.");
  process.exit(0);
}

main();
