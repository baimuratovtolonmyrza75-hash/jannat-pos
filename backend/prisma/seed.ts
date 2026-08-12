import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create Prisma client with pg adapter (required for Prisma 7)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log('🌱 Seeding database...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Верхняя одежда' },
      update: {},
      create: { name: 'Верхняя одежда' },
    }),
    prisma.category.upsert({
      where: { name: 'Повседневная одежда' },
      update: {},
      create: { name: 'Повседневная одежда' },
    }),
    prisma.category.upsert({
      where: { name: 'Обувь' },
      update: {},
      create: { name: 'Обувь' },
    }),
    prisma.category.upsert({
      where: { name: 'Аксессуары' },
      update: {},
      create: { name: 'Аксессуары' },
    }),
  ]);

  console.log('✅ Categories created:', categories.length);

  // Create users
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'owner@jannat.com' },
    update: {},
    create: {
      email: 'owner@jannat.com',
      passwordHash,
      role: Role.OWNER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@jannat.com' },
    update: {},
    create: {
      email: 'admin@jannat.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cashier@jannat.com' },
    update: {},
    create: {
      email: 'cashier@jannat.com',
      passwordHash,
      role: Role.CASHIER,
    },
  });

  console.log('✅ Users created: owner, admin, cashier');

  // Create sample products with demo data for children clothing store
  const products = [
    {
      name: 'Куртка детская зимняя «Снежок»',
      SKU: 'JKT-WIN-001',
      costPrice: 2500,
      sellingPrice: 4500,
      size: '92',
      color: 'Синий',
      categoryId: categories[0].id,
      barcode: '100000000001',
      stock: 20,
    },
    {
      name: 'Куртка детская зимняя «Снежок»',
      SKU: 'JKT-WIN-002',
      costPrice: 2500,
      sellingPrice: 4500,
      size: '98',
      color: 'Красный',
      categoryId: categories[0].id,
      barcode: '100000000002',
      stock: 15,
    },
    {
      name: 'Куртка детская зимняя «Снежок»',
      SKU: 'JKT-WIN-003',
      costPrice: 2700,
      sellingPrice: 4800,
      size: '104',
      color: 'Зелёный',
      categoryId: categories[0].id,
      barcode: '100000000003',
      stock: 10,
    },
    {
      name: 'Джинсы детские «Денди»',
      SKU: 'JNS-001',
      costPrice: 800,
      sellingPrice: 1500,
      size: '92',
      color: 'Синий',
      categoryId: categories[1].id,
      barcode: '100000000004',
      stock: 30,
    },
    {
      name: 'Джинсы детские «Денди»',
      SKU: 'JNS-002',
      costPrice: 800,
      sellingPrice: 1500,
      size: '98',
      color: 'Синий',
      categoryId: categories[1].id,
      barcode: '100000000005',
      stock: 25,
    },
    {
      name: 'Футболка «Радуга»',
      SKU: 'TSH-001',
      costPrice: 300,
      sellingPrice: 600,
      size: '98',
      color: 'Белый',
      categoryId: categories[1].id,
      barcode: '100000000006',
      stock: 50,
    },
    {
      name: 'Футболка «Радуга»',
      SKU: 'TSH-002',
      costPrice: 300,
      sellingPrice: 600,
      size: '104',
      color: 'Жёлтый',
      categoryId: categories[1].id,
      barcode: '100000000007',
      stock: 40,
    },
    {
      name: 'Платье «Цветочек»',
      SKU: 'DRS-001',
      costPrice: 600,
      sellingPrice: 1200,
      size: '92',
      color: 'Розовый',
      categoryId: categories[1].id,
      barcode: '100000000008',
      stock: 18,
    },
    {
      name: 'Кроссовки детские «Звёздочка»',
      SKU: 'SNK-001',
      costPrice: 1200,
      sellingPrice: 2200,
      size: '24',
      color: 'Белый/Розовый',
      categoryId: categories[2].id,
      barcode: '100000000009',
      stock: 12,
    },
    {
      name: 'Кроссовки детские «Звёздочка»',
      SKU: 'SNK-002',
      costPrice: 1200,
      sellingPrice: 2200,
      size: '26',
      color: 'Белый/Синий',
      categoryId: categories[2].id,
      barcode: '100000000010',
      stock: 8,
    },
    {
      name: 'Сапоги зимние «Морозко»',
      SKU: 'BOT-001',
      costPrice: 1800,
      sellingPrice: 3200,
      size: '25',
      color: 'Коричневый',
      categoryId: categories[2].id,
      barcode: '100000000011',
      stock: 5,
    },
    {
      name: 'Шапка вязаная «Мишка»',
      SKU: 'HAT-001',
      costPrice: 250,
      sellingPrice: 500,
      size: 'One Size',
      color: 'Розовый',
      categoryId: categories[3].id,
      barcode: '100000000012',
      stock: 3, // Low stock for testing alerts
    },
    {
      name: 'Шарф детский «Полосатик»',
      SKU: 'SCF-001',
      costPrice: 200,
      sellingPrice: 400,
      size: 'One Size',
      color: 'Разноцветный',
      categoryId: categories[3].id,
      barcode: '100000000013',
      stock: 22,
    },
    {
      name: 'Перчатки детские «Тёплые»',
      SKU: 'GLV-001',
      costPrice: 180,
      sellingPrice: 350,
      size: '4-6 лет',
      color: 'Синий',
      categoryId: categories[3].id,
      barcode: '100000000014',
      stock: 0, // Out of stock for testing
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { SKU: product.SKU },
      update: {},
      create: product,
    });
  }

  console.log('✅ Sample products created:', products.length);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('  Owner:   owner@jannat.com   / password123');
  console.log('  Admin:   admin@jannat.com   / password123');
  console.log('  Cashier: cashier@jannat.com / password123');
  console.log('\n📦 Products seeded:', products.length, 'items across', categories.length, 'categories');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
