import api from "@/lib/axios";
import type {
  LoginRegisterResponse,
  PetsAppUserResponse,
  RegisterPayload,
  UserProfileResponse,
} from "@/features/auth/types/auth.types";

/** `POST /auth/login`: body `{ email, password }`, answer `{ user, token }` plus the session cookie. */
export async function signInPetsAppUser(email: string, password: string) {
  const { data } = await api.post<LoginRegisterResponse>("/auth/login", {
    email: email.trim(),
    password,
  });
  return data;
}

/** `POST /auth/register`: creates a member and signs it in (same answer as login). */
export async function registerPetsAppUser(payload: RegisterPayload) {
  const body: RegisterPayload = {
    email: payload.email.trim(),
    password: payload.password,
    name: payload.name.trim(),
  };
  const country = payload.country?.trim().toUpperCase();
  if (country) body.country = country;
  const { data } = await api.post<LoginRegisterResponse>("/auth/register", body);
  return data;
}

/** `POST /auth/logout`: clears the HttpOnly session cookie. */
export async function signOutPetsAppUser() {
  await api.post("/auth/logout");
}

export async function fetchAuthProfile() {
  const { data } = await api.get<PetsAppUserResponse>("/auth/profile");
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get<UserProfileResponse>("/users/me");
  return data;
}
