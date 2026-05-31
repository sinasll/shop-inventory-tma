import type { WhitelistedUser } from '@prisma/client';
import type { UserProfile, UserSettings } from '@inv/shared';
import { adminIds } from '../../config/env.js';

export function toUserSettings(u: WhitelistedUser): UserSettings {
  return {
    notificationsEnabled: u.notificationsEnabled,
    expiryAlertsEnabled: u.expiryAlertsEnabled,
    lowStockAlertsEnabled: u.lowStockAlertsEnabled,
    dailyAlertTime: u.dailyAlertTime,
    timezone: u.timezone,
    expiryWarningDays: u.expiryWarningDays,
    lowStockThreshold: u.lowStockThreshold,
    scannerSound: u.scannerSound,
    scannerVibration: u.scannerVibration,
    preferRearCamera: u.preferRearCamera,
    offlineCacheEnabled: u.offlineCacheEnabled,
  };
}

export function toUserProfile(u: WhitelistedUser): UserProfile {
  return {
    telegramId: u.telegramId,
    shopName: u.shopName,
    username: u.username,
    locale: u.locale,
    isAdmin: u.isAdmin || adminIds.has(u.telegramId),
    subscription: {
      status: u.status,
      activeUntil: u.activeUntil ? u.activeUntil.toISOString() : null,
    },
    settings: toUserSettings(u),
  };
}
