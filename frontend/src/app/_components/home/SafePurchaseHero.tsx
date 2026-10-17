import estilosHome from "../../home.module.css";
import LandingMockupHero from "./LandingMockupHero";

// Hero principal de la landing: copy del brief + mockup animado (QR, pago, métricas).
export default function SafePurchaseHero({
  onStartFree,
}: Readonly<{
  onStartFree: () => void;
}>) {
  return (
    <section className={estilosHome.hero}>
      <div className={estilosHome.heroTexto}>
        <h1 className={estilosHome.heroTitulo}>
          <span className={estilosHome.tituloNeonCyan}>
            Vendé y comprá sin miedo
          </span>
          <br />
          <span className={estilosHome.tituloNeonVerde}>a que te fallen.</span>
        </h1>

        <p className={estilosHome.heroSubtexto}>
          Tu dinero queda protegido hasta confirmar la entrega. Cobrá en dólares (USDC) para
          que tu ingreso no se licúe, con un QR listo en minutos y 1% por transacción. Hecho
          para quien vende y compra por redes en Latinoamérica.
        </p>

        <div className={estilosHome.botonesHero}>
          <button
            type="button"
            className={estilosHome.botonPrimario}
            onClick={onStartFree}
          >
            Abre tu cuenta gratis
          </button>
          <a className={estilosHome.botonSecundario} href="/api-docs">
            Ver documentación
          </a>
        </div>

        <p className={estilosHome.heroMensajesClave}>
          <span>
            &ldquo;Pagá y cobrá con la plata protegida hasta que se confirme la entrega.&rdquo;
          </span>
          <span>&ldquo;Tu QR de cobro listo en minutos, en dólares (USDC).&rdquo;</span>
          <span>
            &ldquo;Pensado para entregas, anticréticos y recompensas con pago retenido.&rdquo;
          </span>
        </p>
      </div>

      <div className={estilosHome.heroVisual}>
        <LandingMockupHero />
      </div>
    </section>
  );
}
