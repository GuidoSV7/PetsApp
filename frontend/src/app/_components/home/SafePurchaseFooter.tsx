import Link from "next/link";
import estilosHome from "../../home.module.css";

// Footer multcolumna: navegación ancla, developers, soporte y disclaimer.
export default function SafePurchaseFooter() {
  return (
    <footer className={estilosHome.footer}>
      <div className={estilosHome.footerInner}>
        <div className={estilosHome.footerColumnas}>
          <div className={estilosHome.footerCol}>
            <h3 className={estilosHome.footerColTitulo}>PetsApp</h3>
            <ul className={estilosHome.footerLista}>
              <li>
                <a href="/#inicio" className={estilosHome.footerEnlace}>
                  Inicio
                </a>
              </li>
              <li>
                <Link href="/api-docs" className={estilosHome.footerEnlace}>
                  Documentación
                </Link>
              </li>
              <li>
                <a href="/#como-funciona" className={estilosHome.footerEnlace}>
                  Cómo funciona
                </a>
              </li>
              <li>
                <a href="/#precios" className={estilosHome.footerEnlace}>
                  Precios
                </a>
              </li>
              <li>
                <a href="/#quienes-somos" className={estilosHome.footerEnlace}>
                  Quiénes somos
                </a>
              </li>
            </ul>
          </div>
          <div className={estilosHome.footerCol}>
            <h3 className={estilosHome.footerColTitulo}>Developers</h3>
            <ul className={estilosHome.footerLista}>
              <li>
                <Link href="/api-docs" className={estilosHome.footerEnlace}>
                  Documentación
                </Link>
              </li>
              <li>
                <span className={estilosHome.footerEnlaceMuted}>API Reference</span>
              </li>
              <li>
                <span className={estilosHome.footerEnlaceMuted}>Sandbox</span>
              </li>
              <li>
                <span className={estilosHome.footerEnlaceMuted}>Webhooks</span>
              </li>
            </ul>
          </div>
          <div className={estilosHome.footerCol}>
            <h3 className={estilosHome.footerColTitulo}>Soporte</h3>
            <ul className={estilosHome.footerLista}>
              <li>
                <a href="mailto:soporte@petsapp.app" className={estilosHome.footerEnlace}>
                  soporte@petsapp.app
                </a>
              </li>
              <li>
                <span className={estilosHome.footerEnlaceMuted}>Preguntas frecuentes</span>
              </li>
            </ul>
          </div>
        </div>

        <p className={estilosHome.footerDisclaimer}>
          PetsApp no es un exchange, no asesora fiscalmente y no custodia fondos fuera de
          los contratos de escrow que el usuario elija usar.
        </p>

        <div className={estilosHome.footerCopy}>
          © {new Date().getFullYear()} PetsApp. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
