import { z } from 'zod';
import { LOCALES, BATCH_MOVEMENT_TYPES } from '../types/index.js';

/**
 * Single source of validation truth. The API validates requests with
 * these and the web client reuses them for client-side form checks.
 */

export const localeSchema = z.enum(LOCALES);

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'invalid_date' });

export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'invalid_time' });

export const userSettingsSchema = z.object({
  notificationsEnabled: z.boolean(),
  expiryAlertsEnabled: z.boolean(),
  lowStockAlertsEnabled: z.boolean(),
  dailyAlertTime: timeOfDaySchema,
  timezone: z.string().min(1).max(64),
  expiryWarningDays: z.number().int().min(1).max(365),
  lowStockThreshold: z.number().int().min(0).max(100000),
  scannerSound: z.boolean(),
  scannerVibration: z.boolean(),
  preferRearCamera: z.boolean(),
  offlineCacheEnabled: z.boolean(),
});

export const updateSettingsSchema = userSettingsSchema.partial().extend({
  locale: localeSchema.optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const barcodeSchema = z
  .string()
  .trim()
  .min(1, 'barcode_required')
  .max(64)
  .regex(/^[\x20-\x7E]+$/, 'invalid_barcode');

export const createProductSchema = z.object({
  barcode: barcodeSchema,
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().max(100).optional().nullable(),
  costPrice: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
  sellPrice: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  isFavorite: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const addBatchSchema = z.object({
  quantity: z.number().int().positive().max(10_000_000),
  expiryDate: isoDate.optional().nullable(),
  costPrice: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});
export type AddBatchInput = z.infer<typeof addBatchSchema>;

export const movementSchema = z.object({
  type: z.enum(BATCH_MOVEMENT_TYPES),
  quantity: z.number().int().positive().max(10_000_000),
  batchId: z.string().cuid().optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});
export type MovementInput = z.infer<typeof movementSchema>;

export const inventoryQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  filter: z
    .enum(['all', 'expired', 'expiring_soon', 'safe', 'low_stock', 'favorites'])
    .default('all'),
  sort: z.enum(['urgency', 'name', 'quantity', 'recent']).default('urgency'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;

// ── Admin ──────────────────────────────────────────────────────────
export const telegramIdSchema = z.string().regex(/^\d{3,20}$/, 'invalid_telegram_id');

export const adminCreateUserSchema = z.object({
  telegramId: telegramIdSchema,
  shopName: z.string().trim().min(1).max(120),
  username: z.string().trim().max(64).optional().nullable(),
  locale: localeSchema.default('english'),
  subscriptionDays: z.number().int().min(1).max(3650).default(30),
});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

export const adminUpdateUserSchema = z.object({
  shopName: z.string().trim().min(1).max(120).optional(),
  locale: localeSchema.optional(),
  extendDays: z.number().int().min(1).max(3650).optional(),
  disabled: z.boolean().optional(),
  settings: updateSettingsSchema.optional(),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const adminListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
