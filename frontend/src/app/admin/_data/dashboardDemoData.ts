// Datos de demostracion para el panel de administracion (sin backend).

export type SemanaIngresoDemo = {
  label: string;
  porcentaje: number;
  valor: string;
  destacada?: boolean;
};

export type SocioRentabilidadDemo = {
  nombre: string;
  monto: string;
  ancho: number;
  color: string;
  icono: string;
};

export const semanasIngresosDemo: SemanaIngresoDemo[] = [
  { label: "Semana 1", porcentaje: 65, valor: "82.400 SOL" },
  { label: "Semana 2", porcentaje: 85, valor: "112.000 SOL" },
  { label: "Semana 3", porcentaje: 100, valor: "125.450 SOL", destacada: true },
  { label: "Semana 4", porcentaje: 75, valor: "93.000 SOL" },
];

export const sociosRentabilidadDemo: SocioRentabilidadDemo[] = [
  {
    nombre: "HyperSwap DEX",
    monto: "142.500 SOL",
    ancho: 38,
    color: "#f59e0b",
    icono: "/iconos/icon-transacciones.svg",
  },
  {
    nombre: "SolanaArt Gallery",
    monto: "94.300 SOL",
    ancho: 26,
    color: "#3b82f6",
    icono: "/iconos/icon-analytics.svg",
  },
  {
    nombre: "MetaSafe Estates",
    monto: "78.100 SOL",
    ancho: 19,
    color: "#10b981",
    icono: "/iconos/icon-money.svg",
  },
  {
    nombre: "Play2Earn Hub",
    monto: "56.200 SOL",
    ancho: 14,
    color: "#8b5cf6",
    icono: "/iconos/icon-dashboard.svg",
  },
];
