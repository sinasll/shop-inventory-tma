import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../lib/http-error.js';
import type {
  AdminCreateUserInput,
  AdminListQuery,
  AdminUpdateUserInput,
  AdminUserRow,
  Paginated,
} from '@inv/shared';

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86400000);
}

async function audit(
  adminId: string,
  action: string,
  targetUserId: string | null,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetUserId, metadata: metadata ?? undefined },
  });
}

export async function createUser(adminId: string, input: AdminCreateUserInput) {
  const existing = await prisma.whitelistedUser.findUnique({
    where: { telegramId: input.telegramId },
  });
  if (existing) throw HttpError.conflict('user_exists');

  const activeUntil = addDays(new Date(), input.subscriptionDays);
  const user = await prisma.whitelistedUser.create({
    data: {
      telegramId: input.telegramId,
      shopName: input.shopName,
      username: input.username ?? null,
      locale: input.locale,
      status: 'active',
      activeUntil,
    },
  });
  await audit(adminId, 'create_user', user.telegramId, {
    subscriptionDays: input.subscriptionDays,
  });
  return user;
}

export async function updateUser(adminId: string, targetId: string, input: AdminUpdateUserInput) {
  const user = await prisma.whitelistedUser.findUnique({ where: { telegramId: targetId } });
  if (!user) throw HttpError.notFound('user_not_found');

  const data: Prisma.WhitelistedUserUpdateInput = {};
  if (input.shopName !== undefined) data.shopName = input.shopName;
  if (input.locale !== undefined) data.locale = input.locale;

  if (input.disabled !== undefined) {
    data.status = input.disabled
      ? 'disabled'
      : (user.activeUntil && user.activeUntil > new Date() ? 'active' : 'expired');
  }

  if (input.extendDays !== undefined) {
    const base = user.activeUntil && user.activeUntil > new Date() ? user.activeUntil : new Date();
    data.activeUntil = addDays(base, input.extendDays);
    if (input.disabled !== true) data.status = 'active';
  }

  if (input.settings) {
    Object.assign(data, input.settings);
  }

  const updated = await prisma.whitelistedUser.update({ where: { telegramId: targetId }, data });
  await audit(adminId, 'update_user', targetId, {
    extendDays: input.extendDays ?? null,
    disabled: input.disabled ?? null,
  });
  return updated;
}

export async function listUsers(query: AdminListQuery): Promise<Paginated<AdminUserRow>> {
  const where: Prisma.WhitelistedUserWhereInput = query.search
    ? {
        OR: [
          { telegramId: { contains: query.search } },
          { shopName: { contains: query.search, mode: 'insensitive' } },
          { username: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.whitelistedUser.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { _count: { select: { products: true } } },
    }),
    prisma.whitelistedUser.count({ where }),
  ]);

  const items: AdminUserRow[] = rows.map((u) => ({
    telegramId: u.telegramId,
    shopName: u.shopName,
    username: u.username,
    locale: u.locale,
    subscriptionStatus: u.status,
    activeUntil: u.activeUntil ? u.activeUntil.toISOString() : null,
    productCount: u._count.products,
    createdAt: u.createdAt.toISOString(),
    lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
  }));

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    hasMore: query.page * query.pageSize < total,
  };
}

export async function getUser(targetId: string) {
  const user = await prisma.whitelistedUser.findUnique({ where: { telegramId: targetId } });
  if (!user) throw HttpError.notFound('user_not_found');
  return user;
}
