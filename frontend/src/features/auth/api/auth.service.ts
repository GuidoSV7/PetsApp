import api from "@/lib/axios";
import type {
  LoginRegisterResponse,
  PetsAppUserResponse,
} from "@/features/auth/types/auth.types";

export async function signInPetsAppUser(
  correo: string,
  contrasena: string,
  walletAddress?: string,
) {
  const cuerpo: { email: string; password: string; walletAddress?: string } = {
    email: correo.trim(),
    password: contrasena,
  };
  const w = walletAddress?.trim();
  if (w) cuerpo.walletAddress = w;
  const { data } = await api.post<LoginRegisterResponse>("/auth/login", cuerpo);
  return data;
}

export async function registerPetsAppUser(cuerpo: {
  email: string;
  password: string;
  fullName: string;
  country: string;
  walletAddress?: string;
}) {
  const payload: {
    email: string;
    password: string;
    fullName: string;
    country: string;
    walletAddress?: string;
  } = {
    email: cuerpo.email.trim(),
    password: cuerpo.password,
    fullName: cuerpo.fullName.trim(),
    country: cuerpo.country.trim(),
  };
  const w = cuerpo.walletAddress?.trim();
  if (w) payload.walletAddress = w;
  const { data } = await api.post<LoginRegisterResponse>("/auth/register", payload);
  return data;
}

export async function obtenerPerfilAuth(token: string) {
  const { data } = await api.get<PetsAppUserResponse>("/auth/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function obtenerUsuarioYo(token: string) {
  const { data } = await api.get<PetsAppUserResponse>("/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}
