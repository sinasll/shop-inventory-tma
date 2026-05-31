import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddBatchInput,
  CreateProductInput,
  DashboardResponse,
  InventoryQuery,
  MovementInput,
  Paginated,
  ProductDetail,
  ProductSummary,
  StockMovement,
  UpdateProductInput,
  UpdateSettingsInput,
  UserProfile,
} from '@inv/shared';
import { api } from '@/lib/api.js';
import { useAuthStore } from '@/store/auth.js';

// ── Dashboard ──────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardResponse>('/dashboard', { cacheKey: 'dashboard' }),
    staleTime: 30_000,
  });
}

// ── Inventory ──────────────────────────────────────────────────────
export function useInventory(query: InventoryQuery) {
  const qs = new URLSearchParams();
  if (query.search) qs.set('search', query.search);
  qs.set('filter', query.filter);
  qs.set('sort', query.sort);
  qs.set('page', String(query.page));
  qs.set('pageSize', String(query.pageSize));
  const key = qs.toString();
  return useQuery({
    queryKey: ['inventory', key],
    queryFn: () =>
      api<Paginated<ProductSummary>>(`/inventory?${key}`, { cacheKey: `inventory:${key}` }),
    staleTime: 15_000,
  });
}

// ── Product ────────────────────────────────────────────────────────
export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: () => api<{ product: ProductDetail }>(`/products/${id}`, { cacheKey: `product:${id}` }),
    staleTime: 10_000,
  });
}

export async function lookupBarcode(barcode: string) {
  return api<{ found: boolean; product: ProductDetail | null }>(
    `/products/lookup?barcode=${encodeURIComponent(barcode)}`,
  );
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      api<{ product: ProductDetail }>('/products', { method: 'POST', body: input }),
    onSuccess: () => invalidateInventory(qc),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) =>
      api<{ product: ProductDetail }>(`/products/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(['product', id], data);
      invalidateInventory(qc);
    },
  });
}

export function useAddBatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddBatchInput) =>
      api<{ product: ProductDetail }>(`/products/${id}/batches`, { method: 'POST', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(['product', id], data);
      invalidateInventory(qc);
    },
  });
}

export function useMovement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MovementInput) =>
      api<{ product: ProductDetail }>(`/products/${id}/movements`, { method: 'POST', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(['product', id], data);
      invalidateInventory(qc);
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateInventory(qc),
  });
}

// ── Settings ───────────────────────────────────────────────────────
export function useUpdateSettings() {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) =>
      api<{ profile: UserProfile }>('/settings', { method: 'PATCH', body: input }),
    onSuccess: (data) => {
      updateProfile(data.profile);
      // Warning days affect computed statuses — refresh everything.
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

// ── Reports / history ──────────────────────────────────────────────
export function useMovements(productId?: string) {
  const qs = productId ? `?productId=${productId}` : '';
  return useQuery({
    queryKey: ['movements', productId ?? 'all'],
    queryFn: () =>
      api<Paginated<StockMovement>>(`/reports/movements${qs}`, {
        cacheKey: `movements:${productId ?? 'all'}`,
      }),
    staleTime: 20_000,
  });
}

function invalidateInventory(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['inventory'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
}
