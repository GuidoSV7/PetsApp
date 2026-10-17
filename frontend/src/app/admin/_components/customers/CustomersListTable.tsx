import type { PetsAppUserResponse } from "../../../_lib/petsapp-api";
import { recortarCartera } from "../../_data/adminAccountsDemoData";
import estilos from "./customers-list.module.css";

type Props = {
  usuarios: PetsAppUserResponse[];
  onVerDetalle: (idUsuario: string) => void;
};

function claseActivo(activo: boolean | undefined) {
  if (activo === false) return estilos.estadoSuspendido;
  return estilos.estadoActivo;
}

function labelActivo(activo: boolean | undefined) {
  if (activo === false) return "Inactivo";
  return "Activo";
}

// Tabla de usuarios del API admin: enlaces al detalle para editar rol y estado.
export default function CustomersListTable({ usuarios, onVerDetalle }: Props) {
  return (
    <div className={estilos.tarjetaTabla}>
      {usuarios.length === 0 ? (
        <p className={estilos.vacio}>No hay resultados para esta búsqueda.</p>
      ) : (
        <div className={estilos.envoltorioTabla}>
          <table className={estilos.tabla}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Cartera</th>
                <th>Rol</th>
                <th>País</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={estilos.celdaPrincipal}>{u.fullName}</div>
                    <div className={estilos.celdaSecundaria}>{u.id}</div>
                  </td>
                  <td className={estilos.celdaSecundaria}>{u.email}</td>
                  <td className={estilos.mono}>
                    {u.walletAddress ? recortarCartera(u.walletAddress) : "—"}
                  </td>
                  <td>{u.role}</td>
                  <td className={estilos.celdaSecundaria}>{u.country}</td>
                  <td>
                    <span className={`${estilos.pillEstado} ${claseActivo(u.isActive)}`}>
                      {labelActivo(u.isActive)}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={estilos.enlaceDetalle}
                      onClick={() => onVerDetalle(u.id)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
