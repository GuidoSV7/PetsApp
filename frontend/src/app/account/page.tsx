"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { signOutPetsAppUser } from "@/features/auth/api/auth.service";
import {
  clearSession,
  getPetsAppSession,
  isAdminRole,
  type SessionUser,
} from "@/stores/auth-session";
import estilos from "./account.module.css";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const session = getPetsAppSession();
    if (!session) {
      router.replace("/");
      return;
    }
    if (isAdminRole(session.user.role)) {
      router.replace("/admin");
      return;
    }
    setUser(session.user);
  }, [router]);

  const signOut = () => {
    void signOutPetsAppUser().catch(() => undefined);
    clearSession();
    router.push("/");
  };

  if (!user) {
    return <main className={estilos.checking}>Comprobando sesión…</main>;
  }

  return (
    <main className={estilos.panel}>
      <p>
        <Link href="/" className={estilos.backLink}>
          ← Inicio
        </Link>
      </p>
      <h1 className={estilos.title}>Mi cuenta</h1>
      <p className={`${estilos.dato} ${estilos.nombre}`}>
        <strong>Nombre:</strong> {user.name}
      </p>
      <p className={`${estilos.dato} ${estilos.correo}`}>
        <strong>Correo:</strong> {user.email}
      </p>
      <button type="button" className={estilos.logout} onClick={signOut}>
        Cerrar sesión
      </button>
    </main>
  );
}
