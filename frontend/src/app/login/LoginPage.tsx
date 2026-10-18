"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import BrandMark from "@/components/ui/BrandMark";
import { signInPetsAppUser } from "@/features/auth/api/auth.service";
import {
  buildHardcodedAdminSession,
  isHardcodedAdminLogin,
} from "@/features/auth/hardcoded-admin";
import {
  getPetsAppSession,
  isAdminRole,
  savePetsAppSession,
} from "@/stores/auth-session";
import estilos from "./login.module.css";

/** Admin entry: prefers Nest login so JWT works for global model upload. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const session = getPetsAppSession();
    if (session && isAdminRole(session.user.role)) {
      router.replace("/admin");
    }
  }, [router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!isHardcodedAdminLogin(email, password)) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      try {
        const respuesta = await signInPetsAppUser(email, password);
        if (!isAdminRole(respuesta.user.role)) {
          setError("Esta cuenta no tiene acceso de administración.");
          return;
        }
        savePetsAppSession({
          token: respuesta.token,
          user: {
            id: respuesta.user.id,
            name: respuesta.user.name,
            email: respuesta.user.email,
            role: respuesta.user.role,
            roles: respuesta.user.roles,
            country: respuesta.user.country,
          },
        });
      } catch {
        savePetsAppSession(buildHardcodedAdminSession());
      }
      router.replace("/admin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={estilos.page}>
      <main className={estilos.card} aria-label="Iniciar sesión admin">
        <div className={estilos.brand}>
          <BrandMark size={48} />
          <h1 className={estilos.title}>PetsApp Admin</h1>
          <p className={estilos.hint}>
            Entrá con el correo y contraseña de administración.
          </p>
        </div>

        <form className={estilos.form} onSubmit={(e) => void onSubmit(e)}>
          <div className={estilos.field}>
            <label htmlFor="admin-login-email">Correo</label>
            <input
              id="admin-login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className={estilos.field}>
            <label htmlFor="admin-login-password">Contraseña</label>
            <input
              id="admin-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p className={estilos.error} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className={estilos.submit} disabled={busy}>
            Entrar al panel
          </button>
        </form>

        <Link href="/" className={estilos.homeLink}>
          Volver al inicio
        </Link>
      </main>
    </div>
  );
}
