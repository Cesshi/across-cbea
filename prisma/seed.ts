import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { SEED_ROOMS } from '../src/lib/constants';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding rooms...');

  for (const room of SEED_ROOMS) {
    await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: {
        name: room.name,
        type: room.type,
        capacity: room.capacity,
        floor: room.floor,
      },
    });
  }

  console.log(`Seeded ${SEED_ROOMS.length} rooms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
