"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePollar } from "@pollar/react";

import { fetchAuthProfile } from "@/features/auth/api/auth.service";
import {
  LOGOUT_COOKIE_WARNING,
  signOutPetsAppAndClearLocal,
} from "@/features/auth/api/sign-out";
import {
  changePetsAppPassword,
  deleteCurrentUserAccount,
} from "@/app/_lib/petsapp-api";
import {
  clearSession,
  getPetsAppSession,
  getSessionToken,
  isAdminRole,
  updateUserInSession,
  type SessionUser,
} from "@/stores/auth-session";
import { asPetsAppApiError } from "@/lib/errors";
import { isPollarConfigured } from "@/features/pollar/pollar-config";
import { pollarDisplayName } from "@/features/pollar/pollar-display-name";
import { useOptionalNotification } from "@/app/_components/NotificationsProvider";
import estilos from "./account.module.css";

const MIN_PASSWORD_LENGTH = 8;

/** `/account`: Nest security controls, or Pollar identity when Nest session is absent. */
export default function AccountPage() {
  if (isPollarConfigured()) {
    return <PollarAwareAccountPage />;
  }
  return <NestAccountGate />;
}

function NestAccountGate() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  const loadProfile = useCallback(async () => {
    const session = getPetsAppSession();
    if (!session) {
      router.replace("/");
      return;
    }
    if (isAdminRole(session.user.role)) {
      router.replace("/admin");
      return;
    }

    setBooting(true);
    setBootError(null);
    setUser(session.user);

    try {
      const profile = await fetchAuthProfile();
      updateUserInSession({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        roles: profile.roles,
        country: profile.country,
      });
      if (isAdminRole(profile.role)) {
        router.replace("/admin");
        return;
      }
      setUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        roles: profile.roles,
        country: profile.country,
      });
    } catch (error) {
      const status = asPetsAppApiError(error).codigoEstado;
      if (status === 401 || !getPetsAppSession()) {
        clearSession();
        router.replace("/");
        return;
      }
      setBootError(
        asPetsAppApiError(error).message || "No se pudo cargar el perfil.",
      );
    } finally {
      setBooting(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
    // retryNonce lets the user re-run without depending on unstable router identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + explicit retry only
  }, [retryNonce]);

  if (booting && !user) {
    return <main className={estilos.checking}>Comprobando sesión…</main>;
  }

  if (!user) {
    return <main className={estilos.checking}>Comprobando sesión…</main>;
  }

  return (
    <NestAccountPanel
      user={user}
      bootError={bootError}
      onRetryProfile={() => setRetryNonce((n) => n + 1)}
      retryBusy={booting}
      onUserUpdated={setUser}
    />
  );
}

function PollarAwareAccountPage() {
  const router = useRouter();
  const { isAuthenticated, logout, wallet, getClient } = usePollar();
  const [nestUser, setNestUser] = useState<SessionUser | null>(null);
  const [mode, setMode] = useState<"checking" | "nest" | "pollar" | "gone">(
    "checking",
  );
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadNestProfile = async () => {
      const session = getPetsAppSession();
      if (!session) return false;
      if (isAdminRole(session.user.role)) {
        router.replace("/admin");
        return true;
      }

      setBooting(true);
      setBootError(null);
      setNestUser(session.user);
      setMode("nest");

      try {
        const profile = await fetchAuthProfile();
        if (cancelled) return true;
        updateUserInSession({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          roles: profile.roles,
          country: profile.country,
        });
        if (isAdminRole(profile.role)) {
          router.replace("/admin");
          return true;
        }
        setNestUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          roles: profile.roles,
          country: profile.country,
        });
        return true;
      } catch (error) {
        if (cancelled) return false;
        const status = asPetsAppApiError(error).codigoEstado;
        if (status === 401 || !getPetsAppSession()) {
          clearSession();
          return false;
        }
        setBootError(
          asPetsAppApiError(error).message || "No se pudo cargar el perfil.",
        );
        return true;
      } finally {
        if (!cancelled) setBooting(false);
      }
    };

    const resolve = async () => {
      const session = getPetsAppSession();
      if (session) {
        const kept = await loadNestProfile();
        if (cancelled) return;
        if (kept) {
          setMode("nest");
          return;
        }
      }

      if (isAuthenticated) {
        if (!cancelled) setMode("pollar");
        return;
      }

      if (!cancelled) {
        setMode("gone");
        router.replace("/");
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
    // retryNonce: explicit profile retry; isAuthenticated from Pollar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, retryNonce]);

  if (mode === "checking" || mode === "gone") {
    return <main className={estilos.checking}>Comprobando sesión…</main>;
  }

  if (mode === "nest" && nestUser) {
    return (
      <NestAccountPanel
        user={nestUser}
        bootError={bootError}
        onRetryProfile={() => setRetryNonce((n) => n + 1)}
        retryBusy={booting}
        onUserUpdated={setNestUser}
      />
    );
  }

  const profile = getClient().getUserProfile();
  const displayName = pollarDisplayName(profile, wallet);
  const walletAddress = wallet?.address?.trim() || null;
  const mail = profile?.mail?.trim() || null;

  return (
    <PollarAccountPanel
      displayName={displayName}
      mail={mail}
      walletAddress={walletAddress}
      onPollarLogout={logout}
    />
  );
}

function NestAccountPanel({
  user,
  bootError,
  onRetryProfile,
  retryBusy,
  onUserUpdated,
}: Readonly<{
  user: SessionUser;
  bootError: string | null;
  onRetryProfile: () => void;
  retryBusy: boolean;
  onUserUpdated: (user: SessionUser) => void;
}>) {
  const router = useRouter();
  const notify = useOptionalNotification();
  const [logoutBusy, setLogoutBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const signOut = async () => {
    setLogoutBusy(true);
    try {
      const { cookieCleared } = await signOutPetsAppAndClearLocal();
      if (!cookieCleared) {
        notify?.showNotification(LOGOUT_COOKIE_WARNING);
      }
      // Always leave /account so local UI is cleared; home shows retry if needed.
      router.push("/");
    } finally {
      setLogoutBusy(false);
    }
  };

  const onChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(
        `La contraseña nueva debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setPasswordBusy(true);
    try {
      const token = getSessionToken() ?? undefined;
      await changePetsAppPassword(token, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Contraseña actualizada.");
      // Refresh profile after a successful security change.
      try {
        const profile = await fetchAuthProfile();
        const next = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          roles: profile.roles,
          country: profile.country,
        };
        updateUserInSession(next);
        onUserUpdated(next);
      } catch {
        /* profile refresh is best-effort after password change */
      }
    } catch (error) {
      setPasswordError(
        asPetsAppApiError(error).message || "No se pudo cambiar la contraseña.",
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  const onDeleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    setDeleteError(null);
    if (!deletePassword) {
      setDeleteError("Ingresá tu contraseña para confirmar.");
      return;
    }

    setDeleteBusy(true);
    try {
      const token = getSessionToken() ?? undefined;
      await deleteCurrentUserAccount(token, deletePassword);
      clearSession();
      router.push("/");
    } catch (error) {
      setDeleteError(
        asPetsAppApiError(error).message || "No se pudo eliminar la cuenta.",
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <main className={estilos.panel}>
      <p>
        <Link href="/" className={estilos.backLink}>
          ← Inicio
        </Link>
      </p>
      <h1 className={estilos.title}>Mi cuenta</h1>

      {bootError ? (
        <p className={estilos.error} role="alert">
          {bootError}{" "}
          <button
            type="button"
            className={estilos.retryBtn}
            disabled={retryBusy}
            onClick={onRetryProfile}
          >
            Reintentar
          </button>
        </p>
      ) : null}

      <p className={`${estilos.dato} ${estilos.nombre}`}>
        <strong>Nombre:</strong> {user.name}
      </p>
      <p className={`${estilos.dato} ${estilos.correo}`}>
        <strong>Correo:</strong> {user.email}
      </p>

      <div className={estilos.actions}>
        <button
          type="button"
          className={estilos.logout}
          disabled={logoutBusy}
          onClick={() => void signOut()}
        >
          Cerrar sesión
        </button>
      </div>

      <section className={estilos.section} aria-labelledby="change-password-heading">
        <h2 id="change-password-heading" className={estilos.sectionTitle}>
          Cambiar contraseña
        </h2>
        <p className={estilos.sectionHint}>
          Usá una contraseña de al menos {MIN_PASSWORD_LENGTH} caracteres.
        </p>
        {passwordError ? (
          <p className={estilos.error} role="alert">
            {passwordError}
          </p>
        ) : null}
        {passwordSuccess ? (
          <p className={estilos.success} role="status">
            {passwordSuccess}
          </p>
        ) : null}
        <form className={estilos.form} onSubmit={(e) => void onChangePassword(e)}>
          <label className={estilos.label}>
            Contraseña actual
            <input
              className={estilos.input}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label className={estilos.label}>
            Contraseña nueva
            <input
              className={estilos.input}
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </label>
          <label className={estilos.label}>
            Confirmá la contraseña nueva
            <input
              className={estilos.input}
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className={estilos.primaryBtn}
            disabled={passwordBusy}
          >
            Guardar contraseña
          </button>
        </form>
      </section>

      <section className={estilos.section} aria-labelledby="delete-account-heading">
        <h2 id="delete-account-heading" className={estilos.sectionTitle}>
          Eliminar cuenta
        </h2>
        <p className={estilos.sectionHint}>
          Esta acción no se puede deshacer. Ingresá tu contraseña para confirmar.
        </p>
        {deleteError ? (
          <p className={estilos.error} role="alert">
            {deleteError}
          </p>
        ) : null}
        <form className={estilos.form} onSubmit={(e) => void onDeleteAccount(e)}>
          <label className={estilos.label}>
            Contraseña
            <input
              className={estilos.input}
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className={estilos.dangerBtn}
            disabled={deleteBusy}
          >
            Eliminar mi cuenta
          </button>
        </form>
      </section>
    </main>
  );
}

function PollarAccountPanel({
  displayName,
  mail,
  walletAddress,
  onPollarLogout,
}: Readonly<{
  displayName: string;
  mail: string | null;
  walletAddress: string | null;
  onPollarLogout: () => void;
}>) {
  const router = useRouter();
  const notify = useOptionalNotification();
  const [logoutBusy, setLogoutBusy] = useState(false);

  const signOut = async () => {
    setLogoutBusy(true);
    try {
      const { cookieCleared } = await signOutPetsAppAndClearLocal();
      onPollarLogout();
      if (!cookieCleared) {
        notify?.showNotification(LOGOUT_COOKIE_WARNING);
      }
      router.push("/");
    } finally {
      setLogoutBusy(false);
    }
  };

  return (
    <main className={estilos.panel}>
      <p>
        <Link href="/" className={estilos.backLink}>
          ← Inicio
        </Link>
      </p>
      <h1 className={estilos.title}>Mi cuenta</h1>
      <p className={`${estilos.dato} ${estilos.nombre}`}>
        <strong>Nombre:</strong> {displayName}
      </p>
      {mail ? (
        <p className={`${estilos.dato} ${estilos.correo}`}>
          <strong>Correo:</strong> {mail}
        </p>
      ) : null}
      {walletAddress ? (
        <p className={`${estilos.dato} ${estilos.wallet}`}>
          <strong>Billetera:</strong> {walletAddress}
        </p>
      ) : null}

      <div className={estilos.actions}>
        <button
          type="button"
          className={estilos.logout}
          disabled={logoutBusy}
          onClick={() => void signOut()}
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}
