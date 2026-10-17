import estilosHome from "../../home.module.css";

// Minimal public footer: brand, support contact and copyright.
export default function HomeFooter() {
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
            </ul>
          </div>
        </div>

        <div className={estilosHome.footerCopy}>
          © {new Date().getFullYear()} PetsApp. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
