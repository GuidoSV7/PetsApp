"use client";

import {
  useEffect,
  useMemo,
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
  { code: "MX", label: "Mexico" },
  { code: "PE", label: "Peru" },
  { code: "UY", label: "Uruguay" },
  { code: "VE", label: "Venezuela" },
];

const DEFAULT_COUNTRY = "BO";
/** Mirrors the API rule shared by register and change-password. */
const MIN_PASSWORD_LENGTH = 8;

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
  const [paisDropdownAbierto, setPaisDropdownAbierto] = useState(false);
  const wrapperPaisRef = useRef<HTMLDivElement | null>(null);

  const [cargando, setCargando] = useState(false);
  const [mensajeAuth, setMensajeAuth] = useState<string | null>(null);

  const paisSeleccionado = useMemo(() => {
    return countryOptions.find((p) => p.code === codigoPais) ?? countryOptions[0]!;
  }, [codigoPais]);

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
    setPaisDropdownAbierto(false);
  }, [abierta]);

  const cerrarModalInterno = () => {
    setCargando(false);
    onClose();
  };

  useEffect(() => {
    if (!abierta) return;

    const manejadorTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrarModalInterno();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", manejadorTeclado);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", manejadorTeclado);
    };
  }, [abierta]);

  useEffect(() => {
    if (!paisDropdownAbierto) return;

    const manejarClickFuera = (evento: MouseEvent) => {
      const objetivo = evento.target as Node | null;
      if (!objetivo) return;
      if (!wrapperPaisRef.current?.contains(objetivo)) {
        setPaisDropdownAbierto(false);
      }
    };

    window.addEventListener("mousedown", manejarClickFuera);
    return () => window.removeEventListener("mousedown", manejarClickFuera);
  }, [paisDropdownAbierto]);

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

  const enviarFormulario = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (cargando) return;

    setMensajeAuth(null);
    setCargando(true);

    try {
      if (modalMode === "sign-in") {
        completarSesion(await signInPetsAppUser(correo, contrasena));
        return;
      }

      if (!nombreCompleto.trim()) {
        setMensajeAuth("Indica tu nombre completo.");
        setCargando(false);
        return;
      }
      if (contrasena.length < MIN_PASSWORD_LENGTH) {
        setMensajeAuth(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
        setCargando(false);
        return;
      }

      completarSesion(
        await registerPetsAppUser({
          email: correo,
          password: contrasena,
          name: nombreCompleto,
          country: paisSeleccionado.code,
        }),
      );
    } catch (error) {
      setMensajeAuth(asPetsAppApiError(error).message);
    } finally {
      setCargando(false);
    }
  };

  if (!abierta) return null;

  /** Same width in both modes. */
  const claseTamano = estilosModal.tamanoRegistro;

  return (
    <div
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
                  <label
                    className={`${estilosModal.label} ${estilosModal.campoLargo}`}
                  >
                    Correo
                    <input
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

                  <label className={estilosModal.label}>
                    Contraseña
                    <input
                      className={estilosModal.input}
                      type="password"
                      name="contrasena"
                      required
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={MIN_PASSWORD_LENGTH}
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                    />
                  </label>

                  <label className={estilosModal.label}>
                    País
                    <div
                      ref={wrapperPaisRef}
                      className={estilosModal.dropdownControl}
                    >
                      <button
                        type="button"
                        className={estilosModal.dropdownBoton}
                        aria-haspopup="listbox"
                        aria-expanded={paisDropdownAbierto}
                        onClick={() => setPaisDropdownAbierto((v) => !v)}
                      >
                        <span className={estilosModal.dropdownTexto}>
                          {paisSeleccionado.label}
                        </span>
                        <span
                          className={estilosModal.dropdownFlecha}
                          aria-hidden="true"
                        />
                      </button>

                      {paisDropdownAbierto ? (
                        <div
                          className={estilosModal.dropdownMenu}
                          role="listbox"
                          aria-label="Seleccionar país"
                        >
                          {countryOptions.map((pais) => (
                            <button
                              key={pais.code}
                              type="button"
                              className={estilosModal.dropdownItem}
                              data-activo={pais.code === codigoPais}
                              aria-selected={pais.code === codigoPais}
                              onClick={() => {
                                setCodigoPais(pais.code);
                                setPaisDropdownAbierto(false);
                              }}
                            >
                              {pais.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </label>

                  <label
                    className={`${estilosModal.label} ${estilosModal.campoLargo}`}
                  >
                    Nombre completo
                    <input
                      className={estilosModal.input}
                      type="text"
                      name="nombreCompleto"
                      required
                      placeholder="Ej. Ana Pérez"
                      autoComplete="name"
                      value={nombreCompleto}
                      onChange={(e) => setNombreCompleto(e.target.value)}
                    />
                  </label>
                </div>
              ) : (
                <div className={estilosModal.gridRegistro}>
                  <label
                    className={`${estilosModal.label} ${estilosModal.campoLargo}`}
                  >
                    Correo
                    <input
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

                  <label className={estilosModal.label}>
                    Contraseña
                    <input
                      className={estilosModal.input}
                      type="password"
                      name="contrasena"
                      required
                      placeholder="••••••••"
                      autoComplete="current-password"
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                    />
                  </label>
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
