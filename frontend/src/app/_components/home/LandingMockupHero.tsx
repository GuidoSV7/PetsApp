import estilosHome from "../../home.module.css";

// Mockup estilo dashboard de cobro: QR animado, aviso de pago y mini panel (solo CSS).
export default function LandingMockupHero() {
  return (
    <div className={estilosHome.mockupContenedor} aria-hidden="true">
      <div className={estilosHome.mockupCabecera}>
        <span className={estilosHome.mockupPunto} />
        <span className={estilosHome.mockupPunto} />
        <span className={estilosHome.mockupPunto} />
        <span className={estilosHome.mockupTituloVentana}>PetsApp · Vista previa</span>
      </div>

      <div className={estilosHome.mockupCuerpo}>
        <div className={estilosHome.mockupColumnaQr}>
          <p className={estilosHome.mockupEtiqueta}>QR de cobro</p>
          <div className={estilosHome.mockupQr}>
            {Array.from({ length: 64 }).map((_, i) => (
              <span
                key={i}
                className={estilosHome.mockupQrCelda}
                style={{ animationDelay: `${(i % 8) * 0.06 + Math.floor(i / 8) * 0.04}s` }}
              />
            ))}
          </div>
          <p className={estilosHome.mockupQrHint}>Generando…</p>
        </div>

        <div className={estilosHome.mockupColumnaDash}>
          <div className={estilosHome.mockupToast}>
            <span className={estilosHome.mockupToastIcono}>✓</span>
            <div>
              <div className={estilosHome.mockupToastTitulo}>Pago entrante</div>
              <div className={estilosHome.mockupToastMonto}>+12,50 USDC</div>
            </div>
          </div>

          <p className={estilosHome.mockupEtiqueta}>Ingresos · últimos 7 días</p>
          <div className={estilosHome.mockupGrafico}>
            {[40, 65, 45, 80, 55, 90, 70].map((altura, i) => (
              <div key={i} className={estilosHome.mockupBarraWrap}>
                <div
                  className={estilosHome.mockupBarra}
                  style={{
                    height: `${altura}%`,
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className={estilosHome.mockupKpi}>
            <div>
              <div className={estilosHome.mockupKpiValor}>$2.840</div>
              <div className={estilosHome.mockupKpiEtiqueta}>Este mes</div>
            </div>
            <div>
              <div className={estilosHome.mockupKpiValor}>1%</div>
              <div className={estilosHome.mockupKpiEtiqueta}>Comisión</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
