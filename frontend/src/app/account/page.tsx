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
    return (
      <main style={{ padding: 28, fontWeight: 700 }}>
        Comprobando sesión…
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: "48px auto", padding: "0 20px" }}>
      <p style={{ marginBottom: 12 }}>
        <Link href="/">← Inicio</Link>
      </p>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Mi cuenta</h1>
      <p style={{ marginBottom: 4 }}>
        <strong>Nombre:</strong> {user.name}
      </p>
      <p style={{ marginBottom: 20 }}>
        <strong>Correo:</strong> {user.email}
      </p>
      <button type="button" onClick={signOut} style={{ fontWeight: 700, padding: "10px 16px" }}>
        Cerrar sesión
      </button>
    </main>
  );
}
