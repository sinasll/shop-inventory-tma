-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('badini', 'sorani', 'arabic', 'english');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'disabled');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('added', 'sold', 'discarded', 'damaged', 'returned', 'removed', 'adjusted');

-- CreateTable
CREATE TABLE "whitelisted_users" (
    "telegram_id" TEXT NOT NULL,
    "shop_name" TEXT NOT NULL,
    "username" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'english',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "active_until" TIMESTAMP(3),
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "expiry_alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "low_stock_alerts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "daily_alert_time" TEXT NOT NULL DEFAULT '09:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Baghdad',
    "expiry_warning_days" INTEGER NOT NULL DEFAULT 7,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "scanner_sound" BOOLEAN NOT NULL DEFAULT true,
    "scanner_vibration" BOOLEAN NOT NULL DEFAULT true,
    "prefer_rear_camera" BOOLEAN NOT NULL DEFAULT true,
    "offline_cache_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "whitelisted_users_pkey" PRIMARY KEY ("telegram_id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "image_url" TEXT,
    "cost_price" DECIMAL(14,2),
    "sell_price" DECIMAL(14,2),
    "note" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "last_scanned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "initial_quantity" INTEGER NOT NULL,
    "expiry_date" DATE,
    "cost_price" DECIMAL(14,2),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sent_for_date" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_user_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whitelisted_users_status_active_until_idx" ON "whitelisted_users"("status", "active_until");

-- CreateIndex
CREATE INDEX "whitelisted_users_daily_alert_time_idx" ON "whitelisted_users"("daily_alert_time");

-- CreateIndex
CREATE INDEX "products_owner_id_name_idx" ON "products"("owner_id", "name");

-- CreateIndex
CREATE INDEX "products_owner_id_is_favorite_idx" ON "products"("owner_id", "is_favorite");

-- CreateIndex
CREATE INDEX "products_owner_id_last_scanned_at_idx" ON "products"("owner_id", "last_scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_owner_id_barcode_key" ON "products"("owner_id", "barcode");

-- CreateIndex
CREATE INDEX "inventory_batches_owner_id_expiry_date_idx" ON "inventory_batches"("owner_id", "expiry_date");

-- CreateIndex
CREATE INDEX "inventory_batches_product_id_expiry_date_idx" ON "inventory_batches"("product_id", "expiry_date");

-- CreateIndex
CREATE INDEX "inventory_batches_owner_id_quantity_idx" ON "inventory_batches"("owner_id", "quantity");

-- CreateIndex
CREATE INDEX "stock_movements_owner_id_created_at_idx" ON "stock_movements"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "notification_logs_owner_id_created_at_idx" ON "notification_logs"("owner_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_owner_id_kind_sent_for_date_key" ON "notification_logs"("owner_id", "kind", "sent_for_date");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_created_at_idx" ON "admin_audit_logs"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_logs_target_user_id_idx" ON "admin_audit_logs"("target_user_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "whitelisted_users"("telegram_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "whitelisted_users"("telegram_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "whitelisted_users"("telegram_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "whitelisted_users"("telegram_id") ON DELETE CASCADE ON UPDATE CASCADE;
