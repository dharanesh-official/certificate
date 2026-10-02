import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const email = args[0]?.trim().toLowerCase();
  const password = args[1]?.trim();
  const name = args.slice(2).join(" ").trim() || "Portal Administrator";

  if (!email || !password) {
    console.log(`
=============================================================
           CREATE ADMIN USER (SUPABASE / DATABASE)
=============================================================
Usage:
  npx tsx scripts/create-admin.ts <email> <password> [name]

Example:
  npx tsx scripts/create-admin.ts admin@example.com MyPass123! "Super Admin"
=============================================================
`);
    process.exit(1);
  }

  if (!email.includes("@") || !email.includes(".")) {
    console.error("Error: Please provide a valid email address.");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("Error: Password must be at least 6 characters long.");
    process.exit(1);
  }

  console.log(`Creating admin account for: ${email}...`);

  const password_hash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      password_hash,
      name,
    },
    create: {
      email,
      name,
      password_hash,
      role: "ADMIN",
    },
  });

  console.log(`
SUCCESS! Admin account is ready in Supabase:
- ID:    ${admin.id}
- Name:  ${admin.name}
- Email: ${admin.email}
- Role:  ${admin.role}

You can now log in at: http://localhost:3000/admin/login
`);
}

main()
  .catch((e) => {
    console.error("Failed to create admin user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
