import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jannat_pos?schema=public',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current users:', users.map(u => u.email));

  const passwordHash = await bcrypt.hash('123456', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: { passwordHash, role: 'OWNER' },
    create: { email: 'admin@admin.com', passwordHash, role: 'OWNER' },
  });

  console.log('Admin user updated/created: admin@admin.com / password: 123456');
}

main().catch(e => console.error(e)).finally(() => {
  prisma.$disconnect();
  pool.end();
});
