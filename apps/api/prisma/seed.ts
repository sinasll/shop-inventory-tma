import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed: creates an admin/demo shop and a handful of products & batches
 * spanning expired / expiring-soon / safe so the dashboard is populated
 * out of the box. Re-runnable (uses upsert).
 *
 * Set SEED_ADMIN_ID to your own Telegram ID before running.
 */
async function main() {
  const adminId = process.env.SEED_ADMIN_ID ?? '100000001';
  const now = new Date();
  const addDays = (d: number) => new Date(now.getTime() + d * 86400000);

  const admin = await prisma.whitelistedUser.upsert({
    where: { telegramId: adminId },
    update: { isAdmin: true, status: 'active', activeUntil: addDays(3650) },
    create: {
      telegramId: adminId,
      shopName: 'Demo Market',
      username: 'demo_admin',
      locale: 'english',
      isAdmin: true,
      status: 'active',
      activeUntil: addDays(3650),
      lowStockAlertsEnabled: true,
    },
  });

  const products = [
    { barcode: '6291041500213', name: 'Fresh Milk 1L', category: 'Dairy', cost: 0.8, sell: 1.2, expiry: addDays(-2), qty: 6 },
    { barcode: '5449000000996', name: 'Cola 330ml', category: 'Drinks', cost: 0.3, sell: 0.6, expiry: addDays(3), qty: 24 },
    { barcode: '8000500037560', name: 'Chocolate Bar', category: 'Snacks', cost: 0.5, sell: 1.0, expiry: addDays(45), qty: 40 },
    { barcode: '4011200296909', name: 'Yogurt 500g', category: 'Dairy', cost: 0.6, sell: 1.1, expiry: addDays(1), qty: 3 },
    { barcode: '3017620422003', name: 'Hazelnut Spread', category: 'Grocery', cost: 2.5, sell: 4.0, expiry: addDays(200), qty: 12 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { owner_barcode: { ownerId: admin.telegramId, barcode: p.barcode } },
      update: {},
      create: {
        ownerId: admin.telegramId,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        costPrice: p.cost,
        sellPrice: p.sell,
        lastScannedAt: now,
      },
    });

    const existing = await prisma.inventoryBatch.findFirst({
      where: { productId: product.id },
    });
    if (!existing) {
      const batch = await prisma.inventoryBatch.create({
        data: {
          ownerId: admin.telegramId,
          productId: product.id,
          quantity: p.qty,
          initialQuantity: p.qty,
          expiryDate: p.expiry,
          costPrice: p.cost,
        },
      });
      await prisma.stockMovement.create({
        data: {
          ownerId: admin.telegramId,
          productId: product.id,
          batchId: batch.id,
          type: 'added',
          quantity: p.qty,
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`✅ Seeded admin ${adminId} with ${products.length} products.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
