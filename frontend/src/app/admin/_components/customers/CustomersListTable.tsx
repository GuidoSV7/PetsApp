import type { AdminUserResponse } from "../../../_lib/petsapp-api";
import estilos from "./customers-list.module.css";

type Props = {
  usuarios: AdminUserResponse[];
  onVerDetalle: (idUsuario: string) => void;
};

function blockedClass(blocked: boolean) {
  return blocked ? estilos.estadoSuspendido : estilos.estadoActivo;
}

function blockedLabel(blocked: boolean) {
  return blocked ? "Bloqueado" : "Activo";
}

function roleLabel(role: AdminUserResponse["role"]) {
  if (role === "admin") return "Administrador";
  if (role === "super_admin") return "Super admin";
  return "Miembro";
}

// Admin users table: links into detail for block toggle and profile edits.
export default function CustomersListTable({ usuarios, onVerDetalle }: Props) {
  return (
    <div className={estilos.tarjetaTabla}>
      {usuarios.length === 0 ? (
        <p className={estilos.vacio}>No hay resultados para esta búsqueda.</p>
      ) : (
        <div className={estilos.envoltorioTabla}>
          <table className={estilos.tabla}>
            <caption className={estilos.tituloAccesible}>
              Listado de usuarios clientes de PetsApp
            </caption>
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">País</th>
                <th scope="col">Estado</th>
                <th scope="col">Verificado</th>
                <th scope="col">
                  <span className={estilos.tituloAccesible}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={estilos.celdaPrincipal}>{u.userName}</div>
                    <div className={estilos.celdaSecundaria}>{u.id}</div>
                  </td>
                  <td className={estilos.celdaSecundaria}>{u.email}</td>
                  <td>{roleLabel(u.role)}</td>
                  <td className={estilos.celdaSecundaria}>{u.country ?? "—"}</td>
                  <td>
                    <span className={`${estilos.pillEstado} ${blockedClass(u.isBlocked)}`}>
                      {blockedLabel(u.isBlocked)}
                    </span>
                  </td>
                  <td>{u.isVerified ? "Sí" : "No"}</td>
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
