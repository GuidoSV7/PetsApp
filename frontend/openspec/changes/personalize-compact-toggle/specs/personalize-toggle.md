# Spec: personalize compact toggle

- Home does not show coat preset buttons or “Foto” until Personalizar is
  expanded.
- A control named **Personalizar** exists near the top of the pet stage
  (`aria-expanded` false by default).
- Activating Personalizar sets `aria-expanded` true and reveals the
  personalize panel (`role="region"`).
- From the open panel, Pelaje presets and Colores de mi gato (Foto) work as
  before (API coat apply / camera).
- Personalize UI is not rendered below the care action row.
