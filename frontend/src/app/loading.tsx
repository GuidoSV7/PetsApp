import estilos from "./boundaries.module.css";

/** Route loading skeleton for `/`: header plus the pet-stage card. */
export default function CargandoHome() {
  return (
    <div role="status" aria-label="Cargando la home">
      <div className={estilos.headerRow} aria-hidden="true">
        <div className={`${estilos.skeletonBox} ${estilos.headerBrand}`} />
        <div className={`${estilos.skeletonBox} ${estilos.headerAction}`} />
      </div>
      <div className={estilos.bodyRow} aria-hidden="true">
        <div className={`${estilos.skeletonBox} ${estilos.bodyCard}`} />
        <div className={`${estilos.skeletonBox} ${estilos.statusLine}`} />
      </div>
    </div>
  );
}
