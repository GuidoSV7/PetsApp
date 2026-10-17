"use client";

// Contenido central de Analitica: tendencias de volumen, embudo escrow, Bolivia y tabla top.
import AnalyticsVolumeTrendsChart from "./AnalyticsVolumeTrendsChart";
import MerchantTopBusinessesTable from "./MerchantTopBusinessesTable";
import MerchantEscrowFunnel from "./MerchantEscrowFunnel";
import MerchantBusinessVolumeDistribution from "./MerchantBusinessVolumeDistribution";
import estilos from "./central-analytics-content.module.css";

const pasosEmbudo = [
  { label: "Iniciadas", porcentaje: 100, cantidad: "1.240", opacidadColor: 1 },
  { label: "Fondos bloqueados", porcentaje: 85, cantidad: "1.054", opacidadColor: 0.88 },
  { label: "Entrega confirmada", porcentaje: 72, cantidad: "892", opacidadColor: 0.72 },
  { label: "Fondos liberados", porcentaje: 68, cantidad: "843", opacidadColor: 0.58 },
] as const;

const regionesBolivia = [
  { nombre: "Santa Cruz", porcentaje: "42%" },
  { nombre: "La Paz", porcentaje: "31%" },
  { nombre: "Cochabamba", porcentaje: "18%" },
  { nombre: "Otros", porcentaje: "9%" },
] as const;

const filasTopTransacciones = [
  {
    id: "0x8a…4b2",
    monto: "$4.500,00",
    activo: "USDC",
    estado: "completado" as const,
  },
  {
    id: "0x2d…9f1",
    monto: "120,50",
    activo: "SOL",
    estado: "bloqueado" as const,
  },
  {
    id: "0x5c…1a3",
    monto: "$2.250,00",
    activo: "USDC",
    estado: "completado" as const,
  },
] as const;

type Props = {
  /** `merchant`: datos reales de tus negocios (API). `admin`: demo en gráfico + bloques ilustrativos. */
  variant?: "admin" | "merchant";
  businessId?: string;
};

export default function CentralAnalyticsContent({
  variant = "admin",
  businessId,
}: Props) {
  const esComercio = variant === "merchant";

  return (
    <>
      <div className={estilos.filaSuperior}>
        <section className={`${estilos.tarjeta} ${estilos.graficoAncho}`} aria-labelledby="titulo-tendencias-volumen">
          <div className={estilos.cabeceraGrafico}>
            <h2 id="titulo-tendencias-volumen" className={estilos.tituloBloque}>
              {esComercio
                ? "Tendencias de volumen (tus negocios)"
                : "Tendencias de volumen de transacciones"}
            </h2>
            <div className={estilos.leyendaGrafico}>
              <span className={estilos.leyendaPunto}>
                <span className={estilos.puntoSolana} aria-hidden />
                SOL
              </span>
              {!esComercio ? (
                <span className={estilos.leyendaPunto}>
                  <span className={estilos.puntoUsdc} aria-hidden />
                  USDC
                </span>
              ) : null}
            </div>
          </div>
          <AnalyticsVolumeTrendsChart
            variant={esComercio ? "merchant" : "demo"}
            businessId={businessId}
          />
        </section>

        <section className={estilos.tarjeta} aria-labelledby="titulo-embudo">
          <h2 id="titulo-embudo" className={estilos.tituloEmbudo}>
            Embudo de conversión (escrow)
            {esComercio ? (
              <span style={{ display: "block", fontSize: 12, fontWeight: 400, opacity: 0.75 }}>
                Tus órdenes por estado
              </span>
            ) : null}
          </h2>
          {esComercio ? (
            <MerchantEscrowFunnel businessId={businessId} />
          ) : (
            <div className={estilos.listaEmbudo}>
              {pasosEmbudo.map((paso) => (
                <div key={paso.label} className={estilos.filaEmbudo}>
                  <div className={estilos.labelsEmbudo}>
                    <span>{paso.label}</span>
                    <span>{paso.porcentaje}%</span>
                  </div>
                  <div className={estilos.pistaEmbudo}>
                    <div
                      className={estilos.rellenoEmbudo}
                      style={{
                        width: `${paso.porcentaje}%`,
                        backgroundColor: `rgba(153, 69, 255, ${paso.opacidadColor})`,
                      }}
                    >
                      <span className={estilos.textoSobreBarra}>{paso.cantidad}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className={estilos.filaInferior}>
        <section className={estilos.tarjeta} aria-labelledby="titulo-geo">
          <h2 id="titulo-geo" className={estilos.tituloSeccion}>
            {esComercio ? "Volumen por negocio" : "Desglose geográfico: Bolivia"}
            {esComercio ? (
              <span style={{ display: "block", fontSize: 12, fontWeight: 400, opacity: 0.75 }}>
                % del total SOL (pagos escrow)
              </span>
            ) : null}
          </h2>
          {esComercio ? (
            <MerchantBusinessVolumeDistribution businessId={businessId} />
          ) : (
            <div className={estilos.filaGeo}>
              <div className={estilos.columnaMapa}>
                <div className={estilos.envoltorioMapa}>
                  <svg
                    className={estilos.mapaSvg}
                    viewBox="0 0 100 120"
                    aria-hidden
                    focusable="false"
                  >
                    <path d="M40 10 L60 15 L80 40 L75 80 L50 110 L20 90 L10 50 L25 20 Z" />
                  </svg>
                  <p className={estilos.labelMapa}>Núcleo regional Bolivia</p>
                </div>
              </div>
              <div className={estilos.columnaLista}>
                <ul className={estilos.listaRegiones}>
                  {regionesBolivia.map((r) => (
                    <li key={r.nombre} className={estilos.itemRegion}>
                      <span className={estilos.nombreRegion}>{r.nombre}</span>
                      <span className={estilos.porcionRegion}>{r.porcentaje}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <section className={estilos.tarjeta} aria-labelledby="titulo-top-montos">
          <h2 id="titulo-top-montos" className={estilos.tituloSeccion}>
            {esComercio ? "Ranking por negocio (volumen)" : "Montos de transacción más altos"}
          </h2>
          {esComercio ? (
            <MerchantTopBusinessesTable businessId={businessId} />
          ) : (
            <div className={estilos.tablaWrapper}>
              <table className={estilos.tabla}>
                <thead>
                  <tr>
                    <th>ID transacción</th>
                    <th>Monto</th>
                    <th>Activo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filasTopTransacciones.map((fila) => (
                    <tr key={fila.id}>
                      <td className={estilos.idTransaccion}>{fila.id}</td>
                      <td className={estilos.montoDestacado}>{fila.monto}</td>
                      <td>{fila.activo}</td>
                      <td>
                        {fila.estado === "completado" ? (
                          <span className={`${estilos.pastillaEstado} ${estilos.pastillaCompletado}`}>
                            COMPLETADO
                          </span>
                        ) : (
                          <span className={`${estilos.pastillaEstado} ${estilos.pastillaBloqueado}`}>
                            BLOQUEADO
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
