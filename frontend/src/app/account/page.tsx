"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNestSession } from "@/features/auth/useNestSession";
import { isAdminRole } from "@/stores/auth-session";
import { AccountStellarIdentity } from "./AccountStellarIdentity";

export default function AccountPage() {
  const router = useRouter();
  const { session, ready, error, logout } = useNestSession();
  const user = session?.user;
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/");
    else if (isAdminRole(user.role)) router.replace("/admin");
  }, [ready, user, router]);

  const signOut = () => {
    void logout();
    router.push("/");
  };
  if (!ready || !user || isAdminRole(user.role)) {
    return <main style={{ padding: 28, fontWeight: 700 }}>
      {error ? <p role="alert">{error} <Link href="/">Iniciar sesión</Link></p> : "Comprobando sesión…"}
    </main>;
  }
  return (
    <main style={{ maxWidth: 480, margin: "48px auto", padding: "0 20px" }}>
      <p style={{ marginBottom: 12 }}><Link href="/">← Inicio</Link></p>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Mi cuenta</h1>
      <p style={{ marginBottom: 4 }}><strong>Nombre:</strong> {user.name}</p>
      <p style={{ marginBottom: 20 }}><strong>Correo:</strong> <span>{user.email ?? "Sin email · Freighter"}</span></p>
      <AccountStellarIdentity key={user.id} user={user} />
      <button type="button" onClick={signOut} style={{ fontWeight: 700, padding: "10px 16px" }}>Cerrar sesión</button>
    </main>
  );
}
