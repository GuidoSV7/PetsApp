// HTTP client toward the PetsApp NestJS API: auth, profile, and admin users.
// Centralizes the public base URL and Bearer header for UI callers.

import { PetsAppApiError } from "@/lib/errors";
import { petsappPublicClientUrl } from "@/lib/petsapp-api-origin";
import {
  signInPetsAppUser,
  fetchAuthProfile,
  fetchCurrentUser,
  registerPetsAppUser,
} from "@/features/auth/api/auth.service";
import type {
  AdminUserResponse,
  LoginRegisterResponse,
  PetsAppApiRole,
  PetsAppUserResponse,
} from "@/features/auth/types/auth.types";

export { PetsAppApiError };
export {
  signInPetsAppUser,
  fetchAuthProfile,
  fetchCurrentUser,
  registerPetsAppUser,
};
export type {
  AdminUserResponse,
  LoginRegisterResponse,
  PetsAppApiRole,
  PetsAppUserResponse,
};

export function getPetsAppBaseUrl() {
  return petsappPublicClientUrl();
}

export type ApiErrorBody = {
  message?: string;
  error?: string;
  statusCode?: number;
};

async function parseError(response: Response): Promise<never> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const message =
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as ApiErrorBody).message === "string"
      ? (body as ApiErrorBody).message!
      : response.statusText || "Network error";
  throw new PetsAppApiError(message, response.status, body);
}

function networkErrorMessage(base: string, cause: unknown): string {
  const text =
    cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
  const isConnection =
    /failed to fetch|networkerror|load failed|connection refused|aborted/i.test(text) ||
    text === "";
  if (isConnection) {
    return `Could not reach the API (${base}). Is the backend running?`;
  }
  return `Network error: ${text || "unknown"}`;
}

async function requestJson<T>(
  path: string,
  options: RequestInit & { token?: string },
): Promise<T> {
  const base = getPetsAppBaseUrl();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers,
    });
  } catch (cause) {
    throw new PetsAppApiError(networkErrorMessage(base, cause), 0, cause);
  }

  if (!response.ok) {
    await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function updateCurrentUser(token: string, data: { name: string }) {
  return requestJson<unknown>("/users/me", {
    method: "PATCH",
    token,
    body: JSON.stringify({ name: data.name.trim() }),
  });
}

export async function deleteCurrentUserAccount(token: string, password: string) {
  return requestJson<void>("/users/me", {
    method: "DELETE",
    token,
    body: JSON.stringify({ password }),
  });
}

export async function changePetsAppPassword(
  token: string,
  currentPassword: string,
  newPassword: string,
) {
  return requestJson<unknown>("/auth/change-password", {
    method: "POST",
    token,
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

export async function verifyPetsAppPassword(token: string, password: string) {
  return requestJson<unknown>("/auth/verify-password", {
    method: "POST",
    token,
    body: JSON.stringify({ password }),
  });
}

/** `GET /admin/users` returns a CompleteUserDto array; optional `search` only. */
export async function listAdminUsers(token: string, search?: string) {
  const query = new URLSearchParams();
  const trimmed = search?.trim();
  if (trimmed) query.set("search", trimmed);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const raw = await requestJson<AdminUserResponse[] | unknown>(
    `/admin/users${suffix}`,
    { method: "GET", token },
  );
  if (Array.isArray(raw)) return raw as AdminUserResponse[];
  return [];
}

export async function getAdminUserById(token: string, userId: string) {
  return requestJson<AdminUserResponse>(
    `/admin/users/${encodeURIComponent(userId)}`,
    { method: "GET", token },
  );
}

export async function updateAdminUser(
  token: string,
  userId: string,
  data: {
    name?: string;
    email?: string;
    country?: string | null;
  },
) {
  const body: {
    name?: string;
    email?: string;
    country?: string | null;
  } = {};
  if (typeof data.name === "string") body.name = data.name.trim();
  if (typeof data.email === "string") body.email = data.email.trim();
  if (data.country !== undefined) {
    body.country =
      typeof data.country === "string" ? data.country.trim() || null : data.country;
  }

  return requestJson<unknown>(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

/** Toggles `isBlocked` on the server. */
export async function toggleAdminUserBlock(token: string, userId: string) {
  return requestJson<unknown>(
    `/admin/users/${encodeURIComponent(userId)}/toggle-block`,
    {
      method: "POST",
      token,
    },
  );
}
