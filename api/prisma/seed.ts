import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Admin bootstrap is handled in AuthService.onModuleInit so the API
  // can start against an empty database after migrate.
  const campuses = await prisma.campus.count();
  console.log(`Seed noop. campuses=${campuses}. Import CSVs via POST /api/admin/import/:kind`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
