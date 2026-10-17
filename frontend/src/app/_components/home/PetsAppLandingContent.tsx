import Link from "next/link";

import estilosHome from "../../home.module.css";
import { IconoCodigo, IconoEscrow } from "./SafePurchaseIcons";
import {
  BankFrictionIcon,
  IconoCheckCirculo,
  IconoCobroInstantaneo,
  IconoCuentaRapida,
  IconoCasaContrato,
  IconoGraficoMetricas,
  IconoLatamRed,
  IconoLibroDocs,
  IconoMascota,
  IconoPaquete,
  IconoPagoRechazado,
  IconoQrEnlace,
} from "./PetsAppLandingIcons";

const scroll = { scrollMarginTop: 88 } as const;

// Landing con jerarquía visual fuerte, iconos SVG propios y CTAs a documentación.
export default function PetsAppLandingContent({
  onCreateFreeAccount,
}: Readonly<{
  onCreateFreeAccount: () => void;
}>) {
  return (
    <>
      <section id="problema" className={estilosHome.landingSeccion} style={scroll}>
        <div className={estilosHome.landingPanel}>
          <span className={estilosHome.landingPildora}>Por qué PetsApp</span>
          <h2 className={estilosHome.landingTituloXL}>
            En las redes, el problema no es pagar:
            <span className={estilosHome.landingTituloAcento}> es confiar.</span>
          </h2>
          <p className={estilosHome.landingLead}>
            El 95% de los compradores dejó de comprar por miedo a que le fallen. El 86% quiere
            que su dinero quede protegido hasta recibir el producto. En Instagram, WhatsApp o
            Marketplace, cada venta adelantada se siente a ciegas — y se pierden tratos que
            sí se podían cerrar.
          </p>

          <div className={estilosHome.landingGridProblema}>
            <div className={estilosHome.landingTarjetaProblema}>
              <div className={estilosHome.landingIconoAro} data-variant="cyan">
                <IconoPagoRechazado color="var(--primario)" />
              </div>
              <h3 className={estilosHome.landingTarjetaTitulo}>
                El comprador no se anima a pagar adelantado
              </h3>
              <p className={estilosHome.landingTarjetaTexto}>
                Miedo a que no envíen, a que no sea lo pactado, a perder la plata. Por eso
                abandonan el trato.
              </p>
            </div>
            <div className={estilosHome.landingTarjetaProblema}>
              <div className={estilosHome.landingIconoAro} data-variant="lima">
                <BankFrictionIcon color="var(--estado-exito)" />
              </div>
              <h3 className={estilosHome.landingTarjetaTitulo}>El vendedor también se expone</h3>
              <p className={estilosHome.landingTarjetaTexto}>
                Enviar primero y que no paguen, o cobrar y pelear la entrega: el mismo ciclo
                de desconfianza, del otro lado.
              </p>
            </div>
            <div className={estilosHome.landingTarjetaProblema}>
              <div className={estilosHome.landingIconoAro} data-variant="fucsia">
                <IconoLatamRed color="#f472e8" />
              </div>
              <h3 className={estilosHome.landingTarjetaTitulo}>Se pierden ventas buenas</h3>
              <p className={estilosHome.landingTarjetaTexto}>
                No es que no haya demanda: hay trato, hay producto y no hay un tercero que
                retenga el pago hasta confirmar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className={estilosHome.landingSeccion} style={scroll}>
        <span className={estilosHome.landingPildora}>Cómo funciona</span>
        <h2 className={estilosHome.landingTituloSeccion}>Tres pasos para empezar a cobrar</h2>
        <p className={estilosHome.landingSubtituloSeccion}>
          Del registro al primer cobro: pensado para quien vende por redes y necesita que el
          cliente se anime a pagar.
        </p>

        <div className={estilosHome.landingPasosPista}>
          <div className={estilosHome.landingPasoTarjeta}>
            <div className={estilosHome.landingPasoIcono}>
              <IconoCuentaRapida color="var(--primario)" />
            </div>
            <span className={estilosHome.landingPasoBadge}>01</span>
            <h3 className={estilosHome.landingPasoTitulo}>Creá tu cuenta</h3>
            <p className={estilosHome.landingPasoTexto}>
              Registrá tu negocio en minutos y empezá a ofrecer un cobro con más respaldo.
            </p>
          </div>
          <div className={estilosHome.landingPasoTarjeta}>
            <div className={estilosHome.landingPasoIcono}>
              <IconoQrEnlace color="var(--estado-exito)" />
            </div>
            <span className={estilosHome.landingPasoBadge}>02</span>
            <h3 className={estilosHome.landingPasoTitulo}>Generá tu QR o link de pago</h3>
            <p className={estilosHome.landingPasoTexto}>
              Compartilo con tus clientes en persona o por redes.
            </p>
          </div>
          <div className={estilosHome.landingPasoTarjeta}>
            <div className={estilosHome.landingPasoIcono}>
              <IconoCobroInstantaneo color="var(--primario)" />
            </div>
            <span className={estilosHome.landingPasoBadge}>03</span>
            <h3 className={estilosHome.landingPasoTitulo}>Cobrás al instante</h3>
            <p className={estilosHome.landingPasoTexto}>
              El pago llega directo a tu wallet. Nosotros cobramos solo el 1%.
            </p>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className={estilosHome.landingSeccion} style={scroll}>
        <span className={estilosHome.landingPildora}>Producto</span>
        <h2 className={estilosHome.landingTituloSeccion}>Todo lo que necesitás para cobrar con confianza</h2>

        <div className={estilosHome.landingBento}>
          <article className={estilosHome.landingFeatureTarjeta}>
            <div className={estilosHome.landingFeatureCabecera}>
              <div className={estilosHome.landingFeatureIcono}>
                <IconoQrEnlace color="var(--primario)" tamano={26} />
              </div>
              <h3 className={estilosHome.landingFeatureTitulo}>Pagos con QR y links</h3>
            </div>
            <p className={estilosHome.landingFeatureTexto}>
              Generá un QR o un link para tu local o tu tienda. El cliente paga en segundos.
              Cobrá en dólares (USDC) para proteger tu ingreso; Solana es el riel, no el
              argumento de venta.
            </p>
            <div className={estilosHome.landingFeatureDecorQr} aria-hidden>
              <div className={estilosHome.landingMiniQr}>
                {Array.from({ length: 25 }).map((_, i) => (
                  <span key={i} className={estilosHome.landingMiniQrCelda} />
                ))}
              </div>
            </div>
          </article>

          <article className={estilosHome.landingFeatureTarjeta}>
            <div className={estilosHome.landingFeatureCabecera}>
              <div className={estilosHome.landingFeatureIcono}>
                <IconoGraficoMetricas color="var(--estado-exito)" />
              </div>
              <h3 className={estilosHome.landingFeatureTitulo}>Dashboard con métricas</h3>
            </div>
            <p className={estilosHome.landingFeatureTexto}>
              Mirá cuánto ganaste hoy, esta semana o este mes. Varios negocios, varios paneles.
              Exportá reportes cuando quieras.
            </p>
            <div className={estilosHome.mockupDashboardMini} aria-hidden>
              <div className={estilosHome.mockupDashboardBarras}>
                {[50, 72, 48, 88, 64, 92, 58, 78].map((h, i) => (
                  <div key={i} className={estilosHome.mockupDashboardBarra} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className={estilosHome.mockupDashboardLeyenda}>
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
            </div>
          </article>

          <article className={`${estilosHome.landingFeatureTarjeta} ${estilosHome.landingFeatureAncho}`}>
            <div className={estilosHome.landingFeatureCabecera}>
              <div className={estilosHome.landingFeatureIcono}>
                <IconoEscrow color="var(--primario)" />
              </div>
              <h3 className={estilosHome.landingFeatureTitulo}>Pagos protegidos (Escrow)</h3>
            </div>
            <p className={estilosHome.landingFeatureTexto}>
              La visión: el pago queda retenido hasta que se confirma la entrega o la condición
              acordada. Así el comprador se anima y el vendedor no trabaja a ciegas. Lo
              construimos sobre rieles en Solana; el escrow on-chain sigue evolucionando.
            </p>
            <div className={estilosHome.landingEscrowGrid}>
              <div className={estilosHome.landingEscrowItem}>
                <div className={estilosHome.landingEscrowIcono}>
                  <IconoMascota color="var(--primario)" />
                </div>
                <div>
                  <h4 className={estilosHome.landingEscrowItemTitulo}>Mascotas perdidas</h4>
                  <p className={estilosHome.landingEscrowItemTexto}>
                    Recompensa retenida hasta que alguien encuentre a tu mascota. El pago no
                    se entrega a ciegas.
                  </p>
                </div>
              </div>
              <div className={estilosHome.landingEscrowItem}>
                <div className={estilosHome.landingEscrowIcono}>
                  <IconoCasaContrato color="var(--estado-exito)" />
                </div>
                <div>
                  <h4 className={estilosHome.landingEscrowItemTitulo}>Anticrético</h4>
                  <p className={estilosHome.landingEscrowItemTexto}>
                    Monto retenido a plazo; al vencer, la devolución sigue la condición
                    acordada. Menos pelea, más claridad.
                  </p>
                </div>
              </div>
              <div className={estilosHome.landingEscrowItem}>
                <div className={estilosHome.landingEscrowIcono}>
                  <IconoPaquete color="#f472e8" />
                </div>
                <div>
                  <h4 className={estilosHome.landingEscrowItemTitulo}>Entregas y acuerdos</h4>
                  <p className={estilosHome.landingEscrowItemTexto}>
                    El pago se libera solo cuando se cumple la condición que definiste.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <article className={estilosHome.landingFeatureTarjeta}>
            <div className={estilosHome.landingFeatureCabecera}>
              <div className={estilosHome.landingFeatureIcono}>
                <IconoCodigo color="var(--primario)" />
              </div>
              <h3 className={estilosHome.landingFeatureTitulo}>API y Sandbox</h3>
            </div>
            <p className={estilosHome.landingFeatureTexto}>
              Integrá PetsApp en tu web o app. Modo sandbox sin dinero real. Webhooks para
              automatizar. Pensado para equipos que necesitan documentación seria.
            </p>
            <div className={estilosHome.landingDocCta}>
              <Link href="/api-docs" className={estilosHome.landingDocBoton}>
                <IconoLibroDocs color="currentColor" tamano={20} />
                Ver documentación para integrar
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section id="casos-uso" className={estilosHome.landingSeccion} style={scroll}>
        <span className={estilosHome.landingPildora}>Historias</span>
        <h2 className={estilosHome.landingTituloSeccion}>Pensado para negocios reales en LATAM</h2>

        <div className={estilosHome.landingCasosGrid}>
          <figure className={estilosHome.landingHistoria}>
            <div className={estilosHome.landingHistoriaPerfil} aria-hidden>
              M
            </div>
            <figcaption className={estilosHome.landingHistoriaMeta}>María · e-commerce · Bolivia</figcaption>
            <blockquote className={estilosHome.landingHistoriaCita}>
              Cobra en USDC para que lo que gana no se licúe. El cliente paga con un QR; ella
              ve el cobro sin pelear por adelantos a ciegas.
            </blockquote>
          </figure>
          <figure className={estilosHome.landingHistoria}>
            <div className={estilosHome.landingHistoriaPerfil} data-tone="lima" aria-hidden>
              J
            </div>
            <figcaption className={estilosHome.landingHistoriaMeta}>Juan · recompensa · Escrow</figcaption>
            <blockquote className={estilosHome.landingHistoriaCita}>
              Publicó una recompensa con el monto protegido. El dinero se libera cuando alguien
              cumple la condición — no antes.
            </blockquote>
          </figure>
          <figure className={estilosHome.landingHistoria}>
            <div className={estilosHome.landingHistoriaPerfil} data-tone="fucsia" aria-hidden>
              C
            </div>
            <figcaption className={estilosHome.landingHistoriaMeta}>Carlos · anticrético · Contrato</figcaption>
            <blockquote className={estilosHome.landingHistoriaCita}>
              El depósito quedó protegido a plazo. A los 3 años se devolvió según lo
              acordado. Sin sorpresas.
            </blockquote>
          </figure>
        </div>
      </section>

      <section id="precios" className={estilosHome.landingSeccion} style={scroll}>
        <span className={estilosHome.landingPildora}>Precios</span>
        <h2 className={estilosHome.landingTituloSeccion}>Simple. Sin sorpresas.</h2>

        <div className={estilosHome.landingPreciosLayout}>
          <div className={estilosHome.landingPreciosHero}>
            <p className={estilosHome.landingPreciosEtiqueta}>Comisión por cobro</p>
            <p className={estilosHome.landingPreciosGigante}>1%</p>
            <p className={estilosHome.landingPreciosBajada}>
              Sin cuota mensual. Sin letra chica rara. Solo cuando vos cobrás, nosotros también.
            </p>
            <ul className={estilosHome.landingPreciosLista}>
              <li>Cuenta y sandbox gratis</li>
              <li>QR, links, dashboard y escrow incluidos</li>
            </ul>
          </div>
          <div className={estilosHome.landingPreciosTablaWrap}>
            <table className={estilosHome.landingTablaPrecios}>
              <thead>
                <tr>
                  <th scope="col">Incluido en tu cuenta</th>
                  <th scope="col">Plan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Crear cuenta</td>
                  <td>
                    <span className={estilosHome.landingCeldaOk}>
                      <IconoCheckCirculo color="var(--estado-exito)" tamano={16} /> Gratis
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Sandbox / modo dev</td>
                  <td>
                    <span className={estilosHome.landingCeldaOk}>
                      <IconoCheckCirculo color="var(--estado-exito)" tamano={16} /> Gratis
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Comisión por transacción</td>
                  <td className={estilosHome.landingCeldaDestacada}>1%</td>
                </tr>
                <tr>
                  <td>Pagos con QR</td>
                  <td>
                    <span className={estilosHome.landingCeldaOk}>
                      <IconoCheckCirculo color="var(--estado-exito)" tamano={16} /> Incluido
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Links de pago</td>
                  <td>
                    <span className={estilosHome.landingCeldaOk}>
                      <IconoCheckCirculo color="var(--estado-exito)" tamano={16} /> Incluido
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Dashboard con métricas</td>
                  <td>
                    <span className={estilosHome.landingCeldaOk}>
                      <IconoCheckCirculo color="var(--estado-exito)" tamano={16} /> Incluido
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Escrow / contratos</td>
                  <td>
                    <span className={estilosHome.landingCeldaOk}>
                      <IconoCheckCirculo color="var(--estado-exito)" tamano={16} /> Incluido
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Soporte</td>
                  <td>
                    <span className={estilosHome.landingCeldaOk}>
                      <IconoCheckCirculo color="var(--estado-exito)" tamano={16} /> Incluido
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <p className={estilosHome.landingPreciosNota}>
          Sin costos fijos mensuales. Solo pagás cuando cobrás.
        </p>
      </section>

      <section id="quienes-somos" className={estilosHome.landingSeccion} style={scroll}>
        <div className={estilosHome.landingEquipo}>
          <div>
            <span className={estilosHome.landingPildora}>Equipo</span>
            <h2 className={estilosHome.landingTituloSeccion}>Somos de LATAM. Vivimos el problema.</h2>
            <p className={estilosHome.landingEquipoTexto}>
              Somos de LATAM: sabemos lo que es vender por WhatsApp e Instagram y que el trato
              se caiga por desconfianza. Construimos PetsApp para que el pago quede protegido
              hasta confirmar la entrega, y para que cobrar en dólares (USDC) cuide el valor de
              tu trabajo.
            </p>
            <div className={estilosHome.landingEquipoAcciones}>
              <Link href="/api-docs" className={estilosHome.landingDocBotonSecundario}>
                Documentación técnica
              </Link>
            </div>
          </div>
          <div className={estilosHome.landingEquipoVisual} aria-hidden>
            <div className={estilosHome.landingEquipoMapa}>
              <span className={estilosHome.landingMapaPunto} style={{ top: "58%", left: "28%" }} />
              <span className={estilosHome.landingMapaPunto} style={{ top: "62%", left: "32%" }} />
              <span className={estilosHome.landingMapaPunto} style={{ top: "48%", left: "22%" }} />
              <span className={estilosHome.landingMapaPunto} style={{ top: "72%", left: "38%" }} />
            </div>
            <p className={estilosHome.landingEquipoMapaLeyenda}>Negocios conectados en la región</p>
          </div>
        </div>
      </section>

      <section className={estilosHome.seccionCtaFinal}>
        <h2 className={estilosHome.ctaFinalTitulo}>Empezá a cobrar hoy. Gratis.</h2>
        <p className={estilosHome.ctaFinalSub}>
          Unite a los que quieren vender por redes con menos miedo: pago protegido y cobro en
          dólares.
        </p>
        <div className={estilosHome.landingCtaBotones}>
          <button
            type="button"
            className={estilosHome.botonPrimario}
            onClick={onCreateFreeAccount}
          >
            Crear mi cuenta gratis
          </button>
          <Link
            href="/api-docs"
            className={`${estilosHome.botonSecundario} ${estilosHome.landingBotonLink}`}
          >
            Leer documentación
          </Link>
        </div>
      </section>
    </>
  );
}
