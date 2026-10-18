import type { PetsAppSessionData } from "@/stores/auth-session";

/** Temporary bootstrap credentials for `/login` → admin panel. */
export const HARDCODED_ADMIN_EMAIL = "admin@petsapp.io";
export const HARDCODED_ADMIN_PASSWORD = "Admin1234!";
/** Bearer accepted by the pet-model BFF when Nest login is unavailable. */
export const HARDCODED_ADMIN_TOKEN = "hardcoded-admin-dev-token";

export function isHardcodedAdminLogin(
  email: string,
  password: string,
): boolean {
  return (
    email.trim().toLowerCase() === HARDCODED_ADMIN_EMAIL &&
    password === HARDCODED_ADMIN_PASSWORD
  );
}

export function isHardcodedAdminBearer(authorization: string | null): boolean {
  if (!authorization) return false;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return Boolean(match && match[1] === HARDCODED_ADMIN_TOKEN);
}

/** Local session so AdminLayout lets the operator in without Nest seed. */
export function buildHardcodedAdminSession(): PetsAppSessionData {
  return {
    token: HARDCODED_ADMIN_TOKEN,
    user: {
      id: "hardcoded-admin",
      name: "Admin PetsApp",
      email: HARDCODED_ADMIN_EMAIL,
      role: "super_admin",
      roles: ["super_admin", "admin"],
      country: null,
    },
  };
}
