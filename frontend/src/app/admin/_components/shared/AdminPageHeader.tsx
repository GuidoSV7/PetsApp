import estilos from "./admin-page-header.module.css";

// Header shared by admin pages: title, subtitle and an optional CSV export action.
type Props = Readonly<{
  titulo: string;
  subtitulo?: string;
  /** When omitted, the export button is not rendered. */
  alExportar?: () => void;
  exportando?: boolean;
}>;

export default function AdminPageHeader({ titulo, subtitulo, alExportar, exportando = false }: Props) {
  return (
    <header className={estilos.cabecera}>
      <div>
        <h1 className={estilos.titulo}>{titulo}</h1>
        {subtitulo ? <p className={estilos.subtitulo}>{subtitulo}</p> : null}
      </div>
      {alExportar ? (
        <div className={estilos.acciones}>
          <button
            type="button"
            className={estilos.botonExportar}
            onClick={alExportar}
            disabled={exportando}
          >
            {exportando ? "Exportando…" : "Exportar datos"}
          </button>
        </div>
      ) : null}
    </header>
  );
}
