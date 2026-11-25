import estilos from "../boundaries.module.css";

/** Route loading skeleton for `/account`. */
export default function CargandoCuenta() {
  return (
    <div role="status" aria-label="Cargando tu cuenta">
      <div className={estilos.bodyRow} aria-hidden="true">
        <div className={`${estilos.skeletonBox} ${estilos.statusLine}`} />
        <div className={`${estilos.skeletonBox} ${estilos.statusLine}`} />
        <div className={`${estilos.skeletonBox} ${estilos.bodyCard}`} />
      </div>
    </div>
  );
}
