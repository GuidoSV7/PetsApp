"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import estilosHome from "@/app/home.module.css";
import estilosModal from "./auth-modal.module.css";
import BrandMark from "@/components/ui/BrandMark";
import {
  signInPetsAppUser,
  registerPetsAppUser,
} from "@/features/auth/api/auth.service";
import { landingPathForRole, savePetsAppSession } from "@/stores/auth-session";
import type {
  AuthModalMode,
  LoginRegisterResponse,
} from "@/features/auth/types/auth.types";
import { asPetsAppApiError } from "@/lib/errors";

type CountryOption = {
  /** ISO 3166-1 alpha-2, what the API stores in `country`. */
  code: string;
  label: string;
};

const countryOptions: CountryOption[] = [
  { code: "AR", label: "Argentina" },
  { code: "BO", label: "Bolivia" },
  { code: "CL", label: "Chile" },
  { code: "CO", label: "Colombia" },
  { code: "EC", label: "Ecuador" },
  { code: "GT", label: "Guatemala" },
  { code: "MX", label: "México" },
  { code: "PE", label: "Perú" },
  { code: "UY", label: "Uruguay" },
  { code: "VE", label: "Venezuela" },
];

const DEFAULT_COUNTRY = "BO";
/** Mirrors the API rule shared by register and change-password. */
const MIN_PASSWORD_LENGTH = 8;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Field-level validation problems, shown with aria-invalid + aria-describedby. */
type ErroresCampo = {
  contrasena?: string;
  nombreCompleto?: string;
};

// Login and registration modal against the PetsApp API (admin or regular user).
export default function AuthDemoModal({
  abierta,
  initialMode,
  onClose,
}: Readonly<{
  abierta: boolean;
  initialMode: AuthModalMode;
  onClose: () => void;
}>) {
  const router = useRouter();

  const [modalMode, setModalMode] = useState<AuthModalMode>(initialMode);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [codigoPais, setCodigoPais] = useState(DEFAULT_COUNTRY);

  const [cargando, setCargando] = useState(false);
  const [mensajeAuth, setMensajeAuth] = useState<string | null>(null);
  const [erroresCampo, setErroresCampo] = useState<ErroresCampo>({});
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const primerCampoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!abierta) return;
    setModalMode(initialMode);
  }, [abierta, initialMode]);

  // Al cerrar el modal dejamos el formulario limpio para la próxima vez.
  useEffect(() => {
    if (abierta) return;
    setCorreo("");
    setContrasena("");
    setNombreCompleto("");
    setCodigoPais(DEFAULT_COUNTRY);
    setMensajeAuth(null);
    setErroresCampo({});
    setMostrarContrasena(false);
  }, [abierta]);

  const cerrarModalInterno = () => {
    setCargando(false);
    onClose();
  };

  // S4: foco inicial en el primer campo, trampa de Tab, Escape cierra y el
  // foco vuelve al elemento que abrió el modal.
  useEffect(() => {
    if (!abierta) return;

    const elementoPrevio = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const atraparFoco = (evento: KeyboardEvent) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const enfocables = Array.from(
        overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (enfocables.length === 0) return;
      const primero = enfocables[0]!;
      const ultimo = enfocables[enfocables.length - 1]!;
      const activo = document.activeElement as HTMLElement | null;
      if (evento.shiftKey && (activo === primero || !overlay.contains(activo))) {
        evento.preventDefault();
        ultimo.focus();
        return;
      }
      if (!evento.shiftKey && (!activo || !overlay.contains(activo) || activo === ultimo)) {
        evento.preventDefault();
        primero.focus();
      }
    };

    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        cerrarModalInterno();
        return;
      }
      if (evento.key === "Tab") {
        atraparFoco(evento);
      }
    };

    primerCampoRef.current?.focus();
    window.addEventListener("keydown", manejarTeclado);

    return () => {
      window.removeEventListener("keydown", manejarTeclado);
      document.body.style.overflow = "";
      elementoPrevio?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta]);

  /** Persists the session exactly as the API answered it and routes by role. */
  const completarSesion = (respuesta: LoginRegisterResponse) => {
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
    cerrarModalInterno();
    router.push(landingPathForRole(respuesta.user.role));
  };

  const cambiarContrasena = (valor: string) => {
    setContrasena(valor);
    if (erroresCampo.contrasena) {
      setErroresCampo((previos) => ({ ...previos, contrasena: undefined }));
    }
  };

  const cambiarNombreCompleto = (valor: string) => {
    setNombreCompleto(valor);
    if (erroresCampo.nombreCompleto) {
      setErroresCampo((previos) => ({ ...previos, nombreCompleto: undefined }));
    }
  };

  const enviarFormulario = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (cargando) return;

    setMensajeAuth(null);

    try {
      if (modalMode === "sign-in") {
        setCargando(true);
        completarSesion(await signInPetsAppUser(correo, contrasena));
        return;
      }

      const errores: ErroresCampo = {};
      if (!nombreCompleto.trim()) {
        errores.nombreCompleto = "Indicá tu nombre completo.";
      }
      if (contrasena.length < MIN_PASSWORD_LENGTH) {
        errores.contrasena = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
      }
      if (errores.nombreCompleto || errores.contrasena) {
        setErroresCampo(errores);
        return;
      }

      setCargando(true);
      completarSesion(
        await registerPetsAppUser({
          email: correo,
          password: contrasena,
          name: nombreCompleto,
          country: codigoPais,
        }),
      );
    } catch (error) {
      setMensajeAuth(asPetsAppApiError(error).message);
    } finally {
      setCargando(false);
    }
  };

  if (!abierta) return null;

  const estiloCampoError = (campo: keyof ErroresCampo) =>
    erroresCampo[campo] ? estilosModal.inputError : "";

  /** Same width in both modes. */
  const claseTamano = estilosModal.tamanoRegistro;

  const campoContrasena = (
    <div>
      <label className={estilosModal.label} htmlFor="contrasena-modal">
        Contraseña
      </label>
      <span className={estilosModal.controlContrasena}>
        <input
          id="contrasena-modal"
          className={`${estilosModal.input} ${estiloCampoError("contrasena")}`}
          type={mostrarContrasena ? "text" : "password"}
          name="contrasena"
          required
          placeholder="••••••••"
          autoComplete={modalMode === "sign-in" ? "current-password" : "new-password"}
          minLength={MIN_PASSWORD_LENGTH}
          value={contrasena}
          onChange={(e) => cambiarContrasena(e.target.value)}
          aria-invalid={erroresCampo.contrasena ? "true" : undefined}
          aria-describedby={
            erroresCampo.contrasena
              ? "error-contrasena-modal"
              : "regla-contrasena-modal"
          }
        />
        <button
          type="button"
          className={estilosModal.mostrarContrasena}
          aria-pressed={mostrarContrasena}
          onClick={() => setMostrarContrasena((valor) => !valor)}
        >
          {mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
        </button>
      </span>
      {erroresCampo.contrasena ? (
        <p id="error-contrasena-modal" className={estilosModal.errorCampo}>
          {erroresCampo.contrasena}
        </p>
      ) : (
        <p id="regla-contrasena-modal" className={estilosModal.hintCampo}>
          Mínimo 8 caracteres
        </p>
      )}
    </div>
  );

  const campoCorreo = (
    <label className={`${estilosModal.label} ${estilosModal.campoLargo}`}>
      Correo
      <input
        ref={primerCampoRef}
        className={estilosModal.input}
        type="email"
        name="correo"
        required
        placeholder="tu@correo.com"
        autoComplete="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
      />
    </label>
  );

  return (
    <div
      ref={overlayRef}
      className={estilosHome.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) cerrarModalInterno();
      }}
    >
      <div
        className={`${estilosHome.modalContenedor} ${claseTamano}`}
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <div className={estilosModal.modalInterior}>
          <div className={estilosModal.modalScroll}>
            <div className={estilosModal.cabeceraCompacta}>
              <div className={estilosModal.marcaBloque}>
                <div className={`${estilosModal.marcaFila} ${estilosModal.marcaGlow}`}>
                  <BrandMark size={40} />
                  <p className={estilosModal.marcaNombre}>PetsApp</p>
                </div>
                <div>
                  <h2 id="titulo-modal" className={estilosModal.tituloModal}>
                    {modalMode === "sign-in" ? "Entrá a cuidar" : "Creá tu cuenta"}
                  </h2>
                  <p className={estilosModal.hintLinea}>
                    {modalMode === "sign-in"
                      ? "Tu correo abre la puerta a Michi."
                      : "Unos datos y ya podés empezar a cuidar."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={estilosHome.modonClose}
                onClick={cerrarModalInterno}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div
              className={estilosModal.segmentoGrupo}
              role="tablist"
              aria-label="Elegir acceso"
            >
              <button
                type="button"
                role="tab"
                aria-selected={modalMode === "sign-in"}
                className={`${estilosModal.segmentoBoton} ${modalMode === "sign-in" ? estilosModal.segmentoBotonActivo : ""}`}
                disabled={cargando}
                onClick={() => {
                  setMensajeAuth(null);
                  setErroresCampo({});
                  setModalMode("sign-in");
                }}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modalMode === "sign-up"}
                className={`${estilosModal.segmentoBoton} ${modalMode === "sign-up" ? estilosModal.segmentoBotonActivo : ""}`}
                disabled={cargando}
                onClick={() => {
                  setMensajeAuth(null);
                  setErroresCampo({});
                  setModalMode("sign-up");
                }}
              >
                Crear cuenta
              </button>
            </div>

            {mensajeAuth ? (
              <p className={estilosModal.mensajeAuth} role="alert">
                {mensajeAuth}
              </p>
            ) : null}

            <form className={estilosModal.formulario} onSubmit={enviarFormulario}>
              {modalMode === "sign-up" ? (
                <div className={estilosModal.gridRegistro}>
                  {campoCorreo}

                  {campoContrasena}

                  <label className={estilosModal.label}>
                    País
                    <select
                      className={estilosModal.input}
                      name="pais"
                      autoComplete="country"
                      value={codigoPais}
                      onChange={(e) => setCodigoPais(e.target.value)}
                    >
                      {countryOptions.map((pais) => (
                        <option key={pais.code} value={pais.code}>
                          {pais.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={estilosModal.label}>
                    Nombre completo
                    <input
                      className={`${estilosModal.input} ${estiloCampoError("nombreCompleto")}`}
                      type="text"
                      name="nombreCompleto"
                      required
                      placeholder="Ej. Ana Pérez"
                      autoComplete="name"
                      value={nombreCompleto}
                      onChange={(e) => cambiarNombreCompleto(e.target.value)}
                      aria-invalid={erroresCampo.nombreCompleto ? "true" : undefined}
                      aria-describedby={
                        erroresCampo.nombreCompleto
                          ? "error-nombre-completo"
                          : undefined
                      }
                    />
                  </label>
                  {erroresCampo.nombreCompleto ? (
                    <p
                      id="error-nombre-completo"
                      className={`${estilosModal.errorCampo} ${estilosModal.campoLargo}`}
                    >
                      {erroresCampo.nombreCompleto}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className={estilosModal.gridRegistro}>
                  {campoCorreo}

                  {campoContrasena}
                </div>
              )}

              <button
                className={estilosModal.botonEnviar}
                type="submit"
                disabled={cargando}
              >
                {cargando
                  ? "Procesando…"
                  : modalMode === "sign-in"
                    ? "Entrar"
                    : "Crear cuenta"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
