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
import {
  signInPetsAppUser,
  registerPetsAppUser,
} from "@/features/auth/api/auth.service";
import { savePetsAppSession } from "@/stores/auth-session";
import type { AuthModalMode } from "@/features/auth/types/auth.types";
import { asPetsAppApiError } from "@/lib/errors";

type PaisRegistro = {
  codigo: string;
  label: string;
};

// Países con nombre tal como suele esperarse en el backend (string legible).
const paisesRegistro: PaisRegistro[] = [
  { codigo: "ar", label: "Argentina" },
  { codigo: "bo", label: "Bolivia" },
  { codigo: "cl", label: "Chile" },
  { codigo: "co", label: "Colombia" },
  { codigo: "ec", label: "Ecuador" },
  { codigo: "gt", label: "Guatemala" },
  { codigo: "mx", label: "Mexico" },
  { codigo: "pe", label: "Peru" },
  { codigo: "uy", label: "Uruguay" },
  { codigo: "ve", label: "Venezuela" },
];

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
  const [codigoPais, setCodigoPais] = useState("bo");
  const [paisDropdownAbierto, setPaisDropdownAbierto] = useState(false);
  const wrapperPaisRef = useRef<HTMLDivElement | null>(null);

  const [cargando, setCargando] = useState(false);
  const [mensajeAuth, setMensajeAuth] = useState<string | null>(null);

  const paisSeleccionado = useMemo(() => {
    return paisesRegistro.find((p) => p.codigo === codigoPais) ?? paisesRegistro[0]!;
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
    setCodigoPais("bo");
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

  const redirigirSegunRol = (rol: "admin" | "merchant") => {
    router.push(rol === "admin" ? "/admin" : "/");
  };

  const enviarFormulario = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (cargando) return;

    setMensajeAuth(null);
    setCargando(true);

    try {
      if (modalMode === "sign-in") {
        const respuesta = await signInPetsAppUser(correo, contrasena);
        savePetsAppSession({
          token: respuesta.token,
          user: {
            id: respuesta.user.id,
            fullName: respuesta.user.fullName,
            email: respuesta.user.email,
            role: respuesta.user.role,
            country: respuesta.user.country,
            walletAddress: respuesta.user.walletAddress,
            isVerified: respuesta.user.isVerified,
            isActive: respuesta.user.isActive,
          },
        });
        cerrarModalInterno();
        redirigirSegunRol(respuesta.user.role);
        return;
      }

      if (!nombreCompleto.trim()) {
        setMensajeAuth("Indica tu nombre completo.");
        setCargando(false);
        return;
      }

      const respuesta = await registerPetsAppUser({
        email: correo,
        password: contrasena,
        fullName: nombreCompleto.trim(),
        country: paisSeleccionado.label,
      });

      savePetsAppSession({
        token: respuesta.token,
        user: {
          id: respuesta.user.id,
          fullName: respuesta.user.fullName,
          email: respuesta.user.email,
          role: respuesta.user.role,
          country: respuesta.user.country,
          walletAddress: respuesta.user.walletAddress,
          isVerified: respuesta.user.isVerified,
          isActive: respuesta.user.isActive,
        },
      });
      cerrarModalInterno();
      redirigirSegunRol(respuesta.user.role);
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
              <div>
                <h2 id="titulo-modal" className={estilosModal.tituloModal}>
                  {modalMode === "sign-in" ? "Entrá a PetsApp" : "Crear cuenta"}
                </h2>
                <p className={estilosModal.hintLinea}>
                  {modalMode === "sign-in"
                    ? "Ingresá con tu correo y contraseña."
                    : "Completá los datos para crear tu cuenta."}
                </p>
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
                          {paisesRegistro.map((pais) => (
                            <button
                              key={pais.codigo}
                              type="button"
                              className={estilosModal.dropdownItem}
                              data-activo={pais.codigo === codigoPais}
                              aria-selected={pais.codigo === codigoPais}
                              onClick={() => {
                                setCodigoPais(pais.codigo);
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
