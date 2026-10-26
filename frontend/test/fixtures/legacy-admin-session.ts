import type { PetsAppSessionData } from "@/stores/auth-session";

// Retired public values: test-only, never import this fixture into src.
export const legacyCredentials = {
  email: "admin@petsapp.io",
  password: "Admin1234!",
};
export const legacyToken = "hardcoded-admin-dev-token";
export const legacySession: PetsAppSessionData = {
  token: legacyToken,
  user: {
    id: "hardcoded-admin",
    name: "Admin PetsApp",
    email: legacyCredentials.email,
    role: "super_admin",
    roles: ["super_admin", "admin"],
    country: null,
  },
};
export const sessionKeys = ["petsapp_session_v1", "petsapp_sesion_v1"] as const;
export const forbiddenSourceLiterals = [
  legacyCredentials.email,
  legacyCredentials.password,
  legacyToken,
];
