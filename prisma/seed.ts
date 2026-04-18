import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@greenhouse.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";
  const name = process.env.SEED_ADMIN_NAME ?? "مدير النظام";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name, password: hash, role: Role.ADMIN, active: true },
  });

  console.log("✔ Admin user created");
  console.log(`  البريد: ${email}`);
  console.log(`  كلمة المرور: ${password}`);
  console.log("⚠ غيّر كلمة المرور فور أول تسجيل دخول.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
