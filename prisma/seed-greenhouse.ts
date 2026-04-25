import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const DEFAULT_ORG_ID = "default-org";

  await prisma.organization.upsert({
    where: { id: DEFAULT_ORG_ID },
    create: { id: DEFAULT_ORG_ID, name: "الصوبة الرئيسية" },
    update: {},
  });

  const gh = await prisma.greenhouse.upsert({
    where: { organizationId_number: { organizationId: DEFAULT_ORG_ID, number: 1 } },
    create: {
      id: "default-gh",
      organizationId: DEFAULT_ORG_ID,
      name: "الصوبة الرئيسية",
      number: 1,
    },
    update: {},
  });

  await prisma.greenhouseSettings.upsert({
    where: { greenhouseId: gh.id },
    create: { greenhouseId: gh.id },
    update: {},
  });

  const updated = await prisma.cycle.updateMany({
    where: { greenhouseId: { equals: undefined } },
    data: { greenhouseId: gh.id },
  });

  console.log("Seeded greenhouse #1:", gh.id);
  console.log("Updated cycles:", updated.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
