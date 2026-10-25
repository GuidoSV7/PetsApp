import type { PetsAppSessionData } from "@/stores/auth-session";

/** Temporary bootstrap credentials for `/login` → admin panel. */
export const HARDCODED_ADMIN_EMAIL = "admin@petsapp.io";
export const HARDCODED_ADMIN_PASSWORD = "Admin1234!";
/** Token for the temporary browser-local admin session. */
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
