// Cliente HTTP hacia el backend PetsApp: login, registro, perfil y cuenta.
// Centraliza la URL base y el header Bearer para no repetir lógica en componentes.

import { PetsAppApiError } from "@/lib/errors";
import { petsappPublicClientUrl } from "@/lib/petsapp-api-origin";
import {
  signInPetsAppUser,
  obtenerPerfilAuth,
  obtenerUsuarioYo,
  registerPetsAppUser,
} from "@/features/auth/api/auth.service";
import type {
  LoginRegisterResponse,
  PetsAppApiRole,
  PetsAppUserResponse,
} from "@/features/auth/types/auth.types";
import {
  aggregateBusinessMetricRows,
  filterMetricRowsByBusiness,
} from "@/features/merchant-analytics/analytics-business-filter";

export { PetsAppApiError };
export {
  signInPetsAppUser,
  obtenerPerfilAuth,
  obtenerUsuarioYo,
  registerPetsAppUser,
};
export type { LoginRegisterResponse, PetsAppApiRole, PetsAppUserResponse };

export function getPetsAppBaseUrl() {
  return petsappPublicClientUrl();
}

export type ApiErrorBody = {
  message?: string;
  error?: string;
  statusCode?: number;
};

async function parsearError(respuesta: Response): Promise<never> {
  let cuerpo: unknown;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }
  const mensaje =
    typeof cuerpo === "object" &&
    cuerpo !== null &&
    "message" in cuerpo &&
    typeof (cuerpo as ApiErrorBody).message === "string"
      ? (cuerpo as ApiErrorBody).message!
      : respuesta.statusText || "Error de red";
  throw new PetsAppApiError(mensaje, respuesta.status, cuerpo);
}

function mensajeErrorRed(base: string, causa: unknown): string {
  const texto =
    causa instanceof Error ? causa.message : typeof causa === "string" ? causa : "";
  const esConexion =
    /failed to fetch|networkerror|load failed|connection refused|aborted/i.test(texto) ||
    texto === "";
  if (esConexion) {
    return `No se pudo conectar con el API (${base}). ¿Está el backend en marcha en ese puerto? (p. ej. npm run start:dev en la carpeta del servidor).`;
  }
  return `Error de red: ${texto || "desconocido"}`;
}

async function solicitudJson<T>(
  ruta: string,
  opciones: RequestInit & { token?: string }
): Promise<T> {
  const base = getPetsAppBaseUrl();
  const encabezados = new Headers(opciones.headers);
  if (!encabezados.has("Content-Type") && opciones.body !== undefined) {
    encabezados.set("Content-Type", "application/json");
  }
  if (opciones.token) {
    encabezados.set("Authorization", `Bearer ${opciones.token}`);
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}${ruta}`, {
      ...opciones,
      headers: encabezados,
    });
  } catch (causa) {
    throw new PetsAppApiError(mensajeErrorRed(base, causa), 0, causa);
  }

  if (!respuesta.ok) {
    await parsearError(respuesta);
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }

  const texto = await respuesta.text();
  if (!texto) return undefined as T;
  return JSON.parse(texto) as T;
}

// --- Comprador: confirmar recepción (liberar escrow), sin JWT ---

export type PublicPaymentSummary = {
  status: string;
  buyerWallet: string | null;
  orderId: string | null;
  description: string | null;
  businessName: string | null;
};

export async function getPublicPaymentSummary(paymentId: string) {
  return solicitudJson<PublicPaymentSummary>(
    `/api/payments/${encodeURIComponent(paymentId)}/status`,
    { method: "GET" }
  );
}

export async function requestConfirmReceiptTransaction(paymentId: string, account: string) {
  return solicitudJson<{ transaction: string; message: string }>(
    `/api/payments/${encodeURIComponent(paymentId)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ account: account.trim() }),
    }
  );
}

// Perfil / users/me: ver @/features/auth/api/auth.service (re-export arriba)

export async function updateCurrentUser(token: string, datos: { fullName: string }) {
  return solicitudJson<PetsAppUserResponse>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify({ fullName: datos.fullName.trim() }),
  });
}

export async function deleteCurrentUserAccount(token: string, contrasena: string) {
  return solicitudJson<void>("/users/me", {
    method: "DELETE",
    token,
    body: JSON.stringify({ password: contrasena }),
  });
}

export async function changePetsAppPassword(
  token: string,
  contrasenaActual: string,
  contrasenaNueva: string
) {
  return solicitudJson<unknown>("/auth/change-password", {
    method: "POST",
    token,
    body: JSON.stringify({
      currentPassword: contrasenaActual,
      newPassword: contrasenaNueva,
    }),
  });
}

export async function verifyPetsAppPassword(token: string, contrasena: string) {
  return solicitudJson<unknown>("/auth/verify-password", {
    method: "POST",
    token,
    body: JSON.stringify({ password: contrasena }),
  });
}

// --- Panel admin: usuarios (listado paginado, detalle, rol/activo y alternar estado).

/** Interpreta el JSON del listado porque el backend puede devolver `data`, `users` o un arreglo plano. */
function normalizarListadoAdminUsuarios(
  crudo: unknown,
  paginaPedida: number,
  limitePedido: number
): {
  usuarios: PetsAppUserResponse[];
  total: number;
  pagina: number;
  limite: number;
} {
  if (Array.isArray(crudo)) {
    return {
      usuarios: crudo as PetsAppUserResponse[],
      total: crudo.length,
      pagina: paginaPedida,
      limite: limitePedido,
    };
  }
  if (crudo && typeof crudo === "object") {
    const o = crudo as Record<string, unknown>;
    const posibleLista = o.data ?? o.users ?? o.items;
    const usuarios = Array.isArray(posibleLista)
      ? (posibleLista as PetsAppUserResponse[])
      : [];
    const total =
      typeof o.total === "number"
        ? o.total
        : typeof o.totalItems === "number"
          ? o.totalItems
          : usuarios.length;
    const pagina = typeof o.page === "number" ? o.page : paginaPedida;
    const limite = typeof o.limit === "number" ? o.limit : limitePedido;
    return { usuarios, total, pagina, limite };
  }
  return { usuarios: [], total: 0, pagina: paginaPedida, limite: limitePedido };
}

export type AdminUserListFilters = {
  /** Si se indica, el API filtra por rol (p. ej. `merchant` para excluir admins del listado de clientes). */
  role?: PetsAppApiRole;
  search?: string;
};

export async function listAdminUsers(
  token: string,
  pagina: number,
  limite: number,
  filtros?: AdminUserListFilters
) {
  const consulta = new URLSearchParams({
    page: String(pagina),
    limit: String(limite),
  });
  if (filtros?.role) consulta.set("role", filtros.role);
  if (filtros?.search) consulta.set("search", filtros.search);
  const crudo = await solicitudJson<unknown>(`/admin/users?${consulta.toString()}`, {
    method: "GET",
    token,
  });
  return normalizarListadoAdminUsuarios(crudo, pagina, limite);
}

export async function getAdminUserById(token: string, idUsuario: string) {
  return solicitudJson<PetsAppUserResponse>(`/admin/users/${encodeURIComponent(idUsuario)}`, {
    method: "GET",
    token,
  });
}

export async function updateAdminUser(
  token: string,
  idUsuario: string,
  datos: {
    role: PetsAppApiRole;
    isActive: boolean;
    email?: string;
    country?: string;
    walletAddress?: string | null;
  }
) {
  const cuerpo: {
    role: PetsAppApiRole;
    isActive: boolean;
    email?: string;
    country?: string;
    walletAddress?: string | null;
  } = {
    role: datos.role,
    isActive: datos.isActive,
  };
  if (typeof datos.email === "string") cuerpo.email = datos.email.trim();
  if (typeof datos.country === "string") cuerpo.country = datos.country.trim();
  if (datos.walletAddress !== undefined) {
    const limpia =
      typeof datos.walletAddress === "string" ? datos.walletAddress.trim() : datos.walletAddress;
    cuerpo.walletAddress = limpia && limpia.length > 0 ? limpia : null;
  }

  return solicitudJson<PetsAppUserResponse>(`/admin/users/${encodeURIComponent(idUsuario)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(cuerpo),
  });
}

/** Alterna activo/inactivo en servidor (POST dedicado). */
export async function toggleAdminUserActive(token: string, idUsuario: string) {
  return solicitudJson<PetsAppUserResponse | void>(
    `/admin/users/${encodeURIComponent(idUsuario)}/toggle-active`,
    {
      method: "POST",
      token,
    }
  );
}

/** Marca un usuario como verificado en backend admin. */
export async function verifyAdminUser(token: string, idUsuario: string) {
  return solicitudJson<PetsAppUserResponse | void>(
    `/admin/users/${encodeURIComponent(idUsuario)}/verify`,
    {
      method: "POST",
      token,
    }
  );
}

// --- Métricas escrow + comisión (admin) ---

export type AdminCommissionResponse = {
  commissionBps: number;
  updatedAt: string;
};

export type MerchantMetricRow = {
  userId: string;
  email: string;
  totalPayments: number;
  volumeLamports: string;
  volumeSol: string;
  estimatedCommissionLamports: string;
  estimatedCommissionSol: string;
  businessCount: number;
};

export type PaginatedMerchantMetrics = {
  commissionBps: number;
  data: MerchantMetricRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getAdminCommission(token: string) {
  return solicitudJson<AdminCommissionResponse>("/admin/settings/commission", {
    method: "GET",
    token,
  });
}

export async function updateAdminCommission(token: string, commissionBps: number) {
  return solicitudJson<AdminCommissionResponse>("/admin/settings/commission", {
    method: "PATCH",
    token,
    body: JSON.stringify({ commissionBps }),
  });
}

export type MerchantMetricsQuery = {
  page?: number;
  limit?: number;
  sort?: "count" | "volume";
  from?: string;
  to?: string;
};

export async function getAdminMerchantMetrics(
  token: string,
  consulta: MerchantMetricsQuery = {}
) {
  const q = new URLSearchParams();
  if (consulta.page != null) q.set("page", String(consulta.page));
  if (consulta.limit != null) q.set("limit", String(consulta.limit));
  if (consulta.sort) q.set("sort", consulta.sort);
  if (consulta.from) q.set("from", consulta.from);
  if (consulta.to) q.set("to", consulta.to);
  const sufijo = q.toString() ? `?${q.toString()}` : "";
  return solicitudJson<PaginatedMerchantMetrics>(
    `/admin/metrics/merchants/payments${sufijo}`,
    { method: "GET", token }
  );
}

const LAMPORTS_PER_SOL_BIG = BigInt("1000000000");

/** Suma volumen y comisión recorriendo todas las páginas (máx. 100 por página en API). */
export async function fetchAllAdminMerchantMetricsPages(token: string) {
  const limit = 100;
  let page = 1;
  let commissionBps = 0;
  let totalMerchants = 0;
  let totalPayments = 0;
  let volumeLamports = BigInt(0);
  let comisionLamports = BigInt(0);
  let totalPages = 1;

  while (page <= totalPages) {
    const r = await getAdminMerchantMetrics(token, { page, limit, sort: "volume" });
    commissionBps = r.commissionBps;
    totalMerchants = r.total;
    totalPages = r.totalPages;
    for (const row of r.data) {
      totalPayments += row.totalPayments;
      volumeLamports += BigInt(row.volumeLamports || "0");
      comisionLamports += BigInt(row.estimatedCommissionLamports || "0");
    }
    page += 1;
  }

  return {
    commissionBps,
    totalMerchants,
    totalPayments,
    volumeLamports,
    volumenSol: formatLamportsToSol(volumeLamports),
    comisionLamports,
    comisionSol: formatLamportsToSol(comisionLamports),
  };
}

export function formatLamportsToSol(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL_BIG;
  const frac = lamports % LAMPORTS_PER_SOL_BIG;
  if (frac === BigInt(0)) return whole.toString();
  const fracStr = frac.toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

// --- Series temporales + distribución (admin) ---

export type PaymentSeriesPoint = {
  bucketStart: string;
  paymentCount: number;
  volumeLamports: string;
  volumeSol: string;
};

export type AdminPaymentSeriesResponse = {
  groupBy: "day" | "week";
  buckets: number;
  range: { from: string; to: string };
  data: PaymentSeriesPoint[];
};

export type AdminMerchantsDistributionResponse = {
  totalMerchants: number;
  nuevos: number;
  bajoVolumen: number;
  medio: number;
  altoValor: number;
};

export async function getAdminPaymentSeries(
  token: string,
  consulta: { groupBy?: "day" | "week"; buckets?: number } = {}
) {
  const q = new URLSearchParams();
  if (consulta.groupBy) q.set("groupBy", consulta.groupBy);
  if (consulta.buckets != null) q.set("buckets", String(consulta.buckets));
  const sufijo = q.toString() ? `?${q.toString()}` : "";
  return solicitudJson<AdminPaymentSeriesResponse>(
    `/admin/metrics/payments/timeseries${sufijo}`,
    { method: "GET", token }
  );
}

export async function getAdminMerchantsDistribution(token: string) {
  return solicitudJson<AdminMerchantsDistributionResponse>(
    `/admin/metrics/merchants/distribution`,
    { method: "GET", token }
  );
}

// --- Métricas merchant (JWT; sin rutas /admin) ---

export type MyBusinessesPaymentsMetricsResponse = {
  data: Array<{
    businessId: string;
    businessName: string;
    paymentCount: number;
    volumeLamports: string;
    volumeSol: string;
  }>;
};

export async function getMyBusinessesPaymentsMetrics(
  token: string,
  consulta: {
    sort?: "count" | "volume";
    from?: string;
    to?: string;
    businessId?: string;
  } = {},
) {
  const q = new URLSearchParams();
  if (consulta.sort) q.set("sort", consulta.sort);
  if (consulta.from) q.set("from", consulta.from);
  if (consulta.to) q.set("to", consulta.to);
  if (consulta.businessId) q.set("businessId", consulta.businessId);
  const sufijo = q.toString() ? `?${q.toString()}` : "";
  return solicitudJson<MyBusinessesPaymentsMetricsResponse>(
    `/metrics/my-businesses/payments${sufijo}`,
    { method: "GET", token }
  );
}

export type MerchantEscrowLockedResponse = {
  totalLockedLamports: string;
  totalLockedSol: string;
  paymentCount: number;
  byBusiness: Array<{
    businessId: string;
    businessName: string;
    paymentCount: number;
    lockedLamports: string;
    lockedSol: string;
  }>;
  statusesIncluded: string[];
};

export async function getMerchantEscrowSummary(token: string, businessId?: string) {
  const q = new URLSearchParams();
  if (businessId) q.set("businessId", businessId);
  const sufijo = q.toString() ? `?${q.toString()}` : "";
  return solicitudJson<MerchantEscrowLockedResponse>(
    `/metrics/my-businesses/escrow-locked${sufijo}`,
    { method: "GET", token }
  );
}

export async function getMerchantPaymentSeries(
  token: string,
  consulta: { groupBy?: "day" | "week"; buckets?: number; businessId?: string } = {},
) {
  const q = new URLSearchParams();
  if (consulta.groupBy) q.set("groupBy", consulta.groupBy);
  if (consulta.buckets != null) q.set("buckets", String(consulta.buckets));
  if (consulta.businessId) q.set("businessId", consulta.businessId);
  const sufijo = q.toString() ? `?${q.toString()}` : "";
  return solicitudJson<AdminPaymentSeriesResponse>(
    `/metrics/my-payments/timeseries${sufijo}`,
    { method: "GET", token }
  );
}

/** Agrega filas de GET /metrics/my-businesses/payments (todos o un negocio). */
export async function fetchMyBusinessesMetrics(
  token: string,
  consulta: { from?: string; to?: string; businessId?: string } = {},
) {
  const r = await getMyBusinessesPaymentsMetrics(token, {
    sort: "volume",
    from: consulta.from,
    to: consulta.to,
    businessId: consulta.businessId,
  });
  const filas = filterMetricRowsByBusiness(r.data, consulta.businessId);
  const agg = aggregateBusinessMetricRows(filas);
  return {
    totalBusinesses: agg.totalBusinesses,
    businessesWithActivity: agg.businessesWithActivity,
    totalPayments: agg.totalPayments,
    volumeLamports: agg.volumeLamports,
    volumenSol: formatLamportsToSol(agg.volumeLamports),
  };
}

export type MerchantPaymentsFunnelResponse = {
  steps: Array<{
    key: string;
    label: string;
    count: number;
    percentOfFirst: number;
  }>;
  /** Presente en API reciente; si falta, el front asume 0 pendientes. */
  countsByStatus?: {
    pending: number;
    escrow_locked: number;
    disputed: number;
    shipped: number;
    released: number;
    auto_released: number;
  };
};

/** Ordenes por estado: iniciadas → pagados → entrega → liberados (tus negocios). */
export async function getMerchantPaymentsFunnel(token: string, businessId?: string) {
  const q = new URLSearchParams();
  if (businessId) q.set("businessId", businessId);
  const sufijo = q.toString() ? `?${q.toString()}` : "";
  return solicitudJson<MerchantPaymentsFunnelResponse>(
    `/metrics/my-businesses/payment-funnel${sufijo}`,
    { method: "GET", token },
  );
}

// --- Comercio (merchant): negocios y pagos escrow (JWT) ---

export type PetsAppBusiness = {
  id: string;
  name: string;
  walletAddress: string;
  description: string | null;
  category?: string | null;
  logoUrl?: string | null;
  isVerified?: boolean;
  isActive: boolean;
  solanaTxRegister?: string | null;
  createdAt: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type MerchantEscrowPaymentItem = {
  id: string;
  transactionId: string;
  orderId: string | null;
  status: string;
  amount: number;
  sellerWallet: string;
  buyerWallet: string | null;
  escrowPda: string | null;
  qrImageUrl: string | null;
  solanaPayUrl: string;
  paidAt: string | null;
  shippedAt: string | null;
  releasedAt: string | null;
  autoReleaseAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  tokenMint?: string | null;
};

export async function listUserBusinesses(token: string, page = 1, limit = 50) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return solicitudJson<PaginatedResponse<PetsAppBusiness>>(`/businesses?${q}`, {
    method: "GET",
    token,
  });
}

export async function listBusinessEscrowPayments(
  token: string,
  businessId: string,
  page = 1,
  limit = 20
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return solicitudJson<PaginatedResponse<MerchantEscrowPaymentItem>>(
    `/businesses/${encodeURIComponent(businessId)}/payments?${q}`,
    { method: "GET", token }
  );
}

export type PaymentWithBusiness = MerchantEscrowPaymentItem & { businessName: string };

/** Últimos pagos de todos los negocios del merchant (paralelo por negocio). */
export async function listRecentPaymentsAllBusinesses(
  token: string,
  limite = 40
): Promise<PaymentWithBusiness[]> {
  const primera = await listUserBusinesses(token, 1, 80);
  const negocios = primera.data;
  if (negocios.length === 0) return [];

  const lotes = await Promise.all(
    negocios.map(async (b) => {
      const r = await listBusinessEscrowPayments(token, b.id, 1, 25);
      return r.data.map((p) => ({ ...p, businessName: b.name }));
    })
  );
  const mezcla = lotes.flat();
  mezcla.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return mezcla.slice(0, limite);
}

// --- Compatibilidad con módulos legacy de "negocios" ---

function normalizarListadoNegocios(
  crudo: unknown,
  page: number,
  limit: number
): { negocios: PetsAppBusiness[]; total: number; page: number; limit: number; totalPages: number } {
  if (Array.isArray(crudo)) {
    const negocios = crudo as PetsAppBusiness[];
    return {
      negocios,
      total: negocios.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(negocios.length / Math.max(1, limit))),
    };
  }
  if (crudo && typeof crudo === "object") {
    const o = crudo as Record<string, unknown>;
    const posibleLista = o.data ?? o.items ?? o.businesses ?? o.negocios;
    const negocios = Array.isArray(posibleLista) ? (posibleLista as PetsAppBusiness[]) : [];
    const total = typeof o.total === "number" ? o.total : negocios.length;
    const outPage = typeof o.page === "number" ? o.page : page;
    const outLimit = typeof o.limit === "number" ? o.limit : limit;
    const totalPages =
      typeof o.totalPages === "number"
        ? o.totalPages
        : Math.max(1, Math.ceil(total / Math.max(1, outLimit)));
    return { negocios, total, page: outPage, limit: outLimit, totalPages };
  }
  return { negocios: [], total: 0, page, limit, totalPages: 1 };
}

export async function listPetsAppBusinesses(token: string, page = 1, limit = 50) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const crudo = await solicitudJson<unknown>(`/businesses?${q}`, {
    method: "GET",
    token,
  });
  return normalizarListadoNegocios(crudo, page, limit);
}

export async function createPetsAppBusiness(
  token: string,
  datos: {
    name: string;
    description?: string | null;
    category?: string | null;
    logoUrl?: string | null;
    walletAddress: string;
  }
) {
  return solicitudJson<PetsAppBusiness>("/businesses", {
    method: "POST",
    token,
    body: JSON.stringify({
      name: datos.name.trim(),
      description: datos.description ?? null,
      category: datos.category ?? null,
      logoUrl: datos.logoUrl ?? null,
      walletAddress: datos.walletAddress.trim(),
    }),
  });
}

export async function getPetsAppBusiness(token: string, idNegocio: string) {
  return solicitudJson<PetsAppBusiness>(`/businesses/${encodeURIComponent(idNegocio)}`, {
    method: "GET",
    token,
  });
}

export async function updatePetsAppBusiness(
  token: string,
  idNegocio: string,
  datos: {
    name: string;
    description?: string | null;
    category?: string | null;
    logoUrl?: string | null;
    walletAddress?: string;
  }
) {
  const cuerpo: Record<string, unknown> = {
    name: datos.name.trim(),
    description: datos.description ?? null,
  };
  if (datos.category !== undefined) cuerpo.category = datos.category;
  if (datos.logoUrl !== undefined) cuerpo.logoUrl = datos.logoUrl;
  if (datos.walletAddress !== undefined) cuerpo.walletAddress = datos.walletAddress.trim();
  return solicitudJson<PetsAppBusiness>(`/businesses/${encodeURIComponent(idNegocio)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(cuerpo),
  });
}

export async function deletePetsAppBusiness(token: string, idNegocio: string) {
  return solicitudJson<void>(`/businesses/${encodeURIComponent(idNegocio)}`, {
    method: "DELETE",
    token,
  });
}

/** Verifica el negocio on-chain y en BD (POST /businesses/:id/verify). */
export async function verifyPetsAppBusiness(token: string, idNegocio: string) {
  return solicitudJson<PetsAppBusiness>(
    `/businesses/${encodeURIComponent(idNegocio)}/verify`,
    {
      method: "POST",
      token,
    }
  );
}

export async function createPetsAppBusinessQr(
  token: string,
  idNegocio: string,
  datos: {
    label: string;
    type?: string;
    amountLamports?: string | null;
    tokenMint?: string | null;
  }
) {
  return solicitudJson<unknown>(`/businesses/${encodeURIComponent(idNegocio)}/qr-codes`, {
    method: "POST",
    token,
    body: JSON.stringify({
      label: datos.label.trim(),
      type: datos.type ?? "branch",
      amountLamports: datos.amountLamports ?? null,
      tokenMint: datos.tokenMint ?? null,
    }),
  });
}

export async function listPetsAppBusinessQrCodes(
  token: string,
  idNegocio: string,
  page = 1,
  limit = 20
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  const crudo = await solicitudJson<unknown>(
    `/businesses/${encodeURIComponent(idNegocio)}/qr-codes?${q.toString()}`,
    { method: "GET", token }
  );
  if (crudo && typeof crudo === "object") {
    const o = crudo as Record<string, unknown>;
    const items = Array.isArray(o.items) ? o.items : Array.isArray(o.data) ? o.data : [];
    const total = typeof o.total === "number" ? o.total : items.length;
    const outPage = typeof o.page === "number" ? o.page : page;
    const outLimit = typeof o.limit === "number" ? o.limit : limit;
    const totalPages =
      typeof o.totalPages === "number"
        ? o.totalPages
        : Math.max(1, Math.ceil(total / Math.max(1, outLimit)));
    return { items, total, page: outPage, limit: outLimit, totalPages };
  }
  return { items: [], total: 0, page, limit, totalPages: 1 };
}

// --- API pública: negocios (x-api-key + x-secret-key, mismo par que pagos) ---

/** Lista negocios visibles para la clave (1 ítem si la clave es por negocio; todos los activos si es credencial de cuenta). */
export async function listPublicApiBusinesses(publishableKey: string, secretKey: string) {
  return solicitudJson<{ data: PetsAppBusiness[] }>("/api/businesses", {
    method: "GET",
    headers: {
      "x-api-key": publishableKey.trim(),
      "x-secret-key": secretKey.trim(),
    },
  });
}

export async function getPublicApiBusiness(
  publishableKey: string,
  secretKey: string,
  businessId: string
) {
  return solicitudJson<PetsAppBusiness>(`/api/businesses/${encodeURIComponent(businessId)}`, {
    method: "GET",
    headers: {
      "x-api-key": publishableKey.trim(),
      "x-secret-key": secretKey.trim(),
    },
  });
}

// --- API pública de pagos: claves por negocio O credenciales generales /users/me/api-keys (JWT en PetsApp) ---

export type BusinessApiKeyItem = {
  id: string;
  name: string | null;
  publishableKey: string;
  secretKeyPreview: string | null;
  network: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
};

export type CreatedBusinessApiKey = {
  id: string;
  publishableKey: string;
  secretKey: string;
  secretKeyPreview: string | null;
  network: string;
  name: string | null;
  createdAt: string;
  message: string;
};

export async function listBusinessApiKeys(
  token: string,
  businessId: string,
  page = 1,
  limit = 50
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return solicitudJson<{
    data: BusinessApiKeyItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/businesses/${encodeURIComponent(businessId)}/api-keys?${q}`, {
    method: "GET",
    token,
  });
}

export async function createBusinessApiKey(
  token: string,
  businessId: string,
  datos?: { name?: string | null; network?: "devnet" | "testnet" | "mainnet" }
) {
  return solicitudJson<CreatedBusinessApiKey>(
    `/businesses/${encodeURIComponent(businessId)}/api-keys`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        name: datos?.name ?? null,
        network: datos?.network ?? "devnet",
      }),
    }
  );
}

export async function revokeBusinessApiKey(
  token: string,
  businessId: string,
  keyId: string
) {
  return solicitudJson<{ revoked: boolean }>(
    `/businesses/${encodeURIComponent(businessId)}/api-keys/${encodeURIComponent(keyId)}/revoke`,
    {
      method: "PATCH",
      token,
    }
  );
}

/** Credenciales generales del comercio (mismas claves para todos los negocios; solo devnet). */
export async function listMarketAccountApiKeys(token: string, page = 1, limit = 50) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return solicitudJson<{
    data: BusinessApiKeyItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/users/me/api-keys?${q}`, {
    method: "GET",
    token,
  });
}

export async function createMarketAccountApiKey(
  token: string,
  datos?: { name?: string | null }
) {
  return solicitudJson<CreatedBusinessApiKey>(`/users/me/api-keys`, {
    method: "POST",
    token,
    body: JSON.stringify({
      name: datos?.name ?? null,
    }),
  });
}

export async function revokeMarketAccountApiKey(token: string, keyId: string) {
  return solicitudJson<{ revoked: boolean }>(
    `/users/me/api-keys/${encodeURIComponent(keyId)}/revoke`,
    {
      method: "PATCH",
      token,
    }
  );
}
