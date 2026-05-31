/**
 * Shared domain types used by both the API and the web client.
 * Keeping these in one place guarantees the contract between
 * frontend and backend never drifts.
 */

export const LOCALES = ['badini', 'sorani', 'arabic', 'english'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'english';

/** RTL locales — used by the client to flip layout direction. */
export const RTL_LOCALES: Locale[] = ['badini', 'sorani', 'arabic'];
export const isRtl = (locale: Locale): boolean => RTL_LOCALES.includes(locale);

/** Expiry health buckets driving the dashboard color coding. */
export type ExpiryStatus = 'expired' | 'expiring_soon' | 'safe' | 'no_expiry';

/** Reasons a batch quantity can leave inventory. */
export const BATCH_MOVEMENT_TYPES = [
  'sold',
  'discarded',
  'damaged',
  'returned',
  'removed',
  'adjusted',
] as const;
export type BatchMovementType = (typeof BATCH_MOVEMENT_TYPES)[number];

export type SubscriptionStatus = 'active' | 'expired' | 'disabled';

export interface UserProfile {
  telegramId: string;
  shopName: string;
  username: string | null;
  locale: Locale;
  isAdmin: boolean;
  subscription: {
    status: SubscriptionStatus;
    activeUntil: string | null; // ISO date
  };
  settings: UserSettings;
}

export interface UserSettings {
  notificationsEnabled: boolean;
  expiryAlertsEnabled: boolean;
  lowStockAlertsEnabled: boolean;
  dailyAlertTime: string; // "HH:mm" 24h, in the user's timezone
  timezone: string; // IANA tz, e.g. "Asia/Baghdad"
  expiryWarningDays: number; // days before expiry to warn
  lowStockThreshold: number; // qty at/below which low-stock triggers
  scannerSound: boolean;
  scannerVibration: boolean;
  preferRearCamera: boolean;
  offlineCacheEnabled: boolean;
}

export interface ProductSummary {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  totalQuantity: number;
  earliestExpiry: string | null; // ISO date
  expiryStatus: ExpiryStatus;
  isFavorite: boolean;
  updatedAt: string;
}

export interface BatchGroup {
  expiryDate: string | null; // ISO date (grouped)
  quantity: number;
  expiryStatus: ExpiryStatus;
  batchIds: string[];
}

export interface ProductDetail extends ProductSummary {
  costPrice: number | null;
  sellPrice: number | null;
  note: string | null;
  batches: InventoryBatch[];
  groupedBatches: BatchGroup[];
  createdAt: string;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  quantity: number;
  initialQuantity: number;
  expiryDate: string | null;
  expiryStatus: ExpiryStatus;
  costPrice: number | null;
  note: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalBatches: number;
  totalUnits: number;
  expiredCount: number;
  expiringSoonCount: number;
  safeCount: number;
  lowStockCount: number;
  estimatedStockValue: number | null;
}

export interface DashboardResponse {
  stats: DashboardStats;
  critical: ProductSummary[]; // urgency-sorted (expired first)
  recentlyScanned: ProductSummary[];
  generatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  batchId: string | null;
  type: BatchMovementType | 'added';
  quantity: number;
  note: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

/** Admin views. */
export interface AdminUserRow {
  telegramId: string;
  shopName: string;
  username: string | null;
  locale: Locale;
  subscriptionStatus: SubscriptionStatus;
  activeUntil: string | null;
  productCount: number;
  createdAt: string;
  lastSeenAt: string | null;
}
