// Clientes y transacciones de demostracion (logica tipo pasarela: cartera Solana + filas de pago).

export type DemoCustomer = {
  id: string;
  alias: string;
  correo: string;
  cartera: string;
  estado: "activo" | "suspendido" | "pendiente";
  transactionsTotal: number;
  volumenSolEtiqueta: string;
  volumenUsdcEtiqueta: string;
  ultimaActividad: string;
  registro: string;
};

export type DemoTransaction = {
  id: string;
  customerId: string;
  monto: string;
  activo: "SOL" | "USDC";
  estado: "completado" | "bloqueado" | "disputa" | "pendiente";
  fecha: string;
  tipo: "pago" | "escrow" | "liberacion";
};

export const demoCustomers: DemoCustomer[] = [
  {
    id: "cli-001",
    alias: "María Vargas",
    correo: "maria.vargas@correo.demo",
    cartera: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    estado: "activo",
    transactionsTotal: 24,
    volumenSolEtiqueta: "182,40 SOL",
    volumenUsdcEtiqueta: "$12.400",
    ultimaActividad: "Hoy, 09:14",
    registro: "12 oct 2024",
  },
  {
    id: "cli-002",
    alias: "Comercial Andina SRL",
    correo: "pagos@andina.demo",
    cartera: "GjJweVh2hv3n9g9K9vFqQzQzQzQzQzQzQzQzQzQzQzQzQ",
    estado: "activo",
    transactionsTotal: 118,
    volumenSolEtiqueta: "2.450,00 SOL",
    volumenUsdcEtiqueta: "$88.200",
    ultimaActividad: "Ayer",
    registro: "03 ene 2024",
  },
  {
    id: "cli-003",
    alias: "Lucas Quispe",
    correo: "lucas.q@correo.demo",
    cartera: "9WzDXwBbmkg8ZTbNMqUxvVFAHYuXa8dYpLF7YxdzXp9",
    estado: "pendiente",
    transactionsTotal: 2,
    volumenSolEtiqueta: "4,20 SOL",
    volumenUsdcEtiqueta: "$0",
    ultimaActividad: "Hace 5 días",
    registro: "02 mar 2025",
  },
  {
    id: "cli-004",
    alias: "NFT Lab SC",
    correo: "ops@nftlab.demo",
    cartera: "4NdN4tXvFqQzQzQzQzQzQzQzQzQzQzQzQzQzQzQzQzQzQ",
    estado: "suspendido",
    transactionsTotal: 41,
    volumenSolEtiqueta: "310,00 SOL",
    volumenUsdcEtiqueta: "$4.100",
    ultimaActividad: "Hace 20 días",
    registro: "18 nov 2023",
  },
  {
    id: "cli-005",
    alias: "Sofía Mercado",
    correo: "sofia.m@correo.demo",
    cartera: "B5nKpL2mN8vR3sT6uW9xY0zA1bC4dE7fG0hI2jK5mN8p",
    estado: "activo",
    transactionsTotal: 9,
    volumenSolEtiqueta: "56,10 SOL",
    volumenUsdcEtiqueta: "$2.050",
    ultimaActividad: "Hoy, 14:02",
    registro: "21 feb 2025",
  },
];

export const demoTransactions: DemoTransaction[] = [
  {
    id: "tx-9k2m",
    customerId: "cli-001",
    monto: "12,50 SOL",
    activo: "SOL",
    estado: "completado",
    fecha: "2025-03-19T09:14:00",
    tipo: "liberacion",
  },
  {
    id: "tx-8j1n",
    customerId: "cli-001",
    monto: "$450,00",
    activo: "USDC",
    estado: "bloqueado",
    fecha: "2025-03-18T16:40:00",
    tipo: "escrow",
  },
  {
    id: "tx-7h4p",
    customerId: "cli-002",
    monto: "210,00 SOL",
    activo: "SOL",
    estado: "completado",
    fecha: "2025-03-19T08:00:00",
    tipo: "pago",
  },
  {
    id: "tx-6g3q",
    customerId: "cli-002",
    monto: "$5.000,00",
    activo: "USDC",
    estado: "pendiente",
    fecha: "2025-03-17T11:22:00",
    tipo: "escrow",
  },
  {
    id: "tx-5f2r",
    customerId: "cli-003",
    monto: "2,10 SOL",
    activo: "SOL",
    estado: "completado",
    fecha: "2025-03-14T10:00:00",
    tipo: "pago",
  },
  {
    id: "tx-4e1s",
    customerId: "cli-004",
    monto: "45,00 SOL",
    activo: "SOL",
    estado: "disputa",
    fecha: "2025-02-28T09:30:00",
    tipo: "escrow",
  },
  {
    id: "tx-3d0t",
    customerId: "cli-005",
    monto: "$890,00",
    activo: "USDC",
    estado: "completado",
    fecha: "2025-03-19T14:02:00",
    tipo: "liberacion",
  },
  {
    id: "tx-2c9u",
    customerId: "cli-005",
    monto: "8,00 SOL",
    activo: "SOL",
    estado: "completado",
    fecha: "2025-03-10T12:15:00",
    tipo: "pago",
  },
];

export function getCustomerById(id: string): DemoCustomer | undefined {
  return demoCustomers.find((c) => c.id === id);
}

export function getTransactionsByCustomer(customerId: string): DemoTransaction[] {
  return demoTransactions.filter((t) => t.customerId === customerId);
}

export function getCustomerName(customerId: string): string {
  return demoCustomers.find((c) => c.id === customerId)?.alias ?? customerId;
}

/** Recorta una direccion de cartera para mostrar en tablas. */
export function recortarCartera(cartera: string, inicio = 6, fin = 4): string {
  if (cartera.length <= inicio + fin + 1) return cartera;
  return `${cartera.slice(0, inicio)}…${cartera.slice(-fin)}`;
}

export function formatDemoDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-BO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export const transactionTypeLabels: Record<DemoTransaction["tipo"], string> = {
  pago: "Pago",
  escrow: "Escrow",
  liberacion: "Liberación",
};

/** Totales derivados para tarjetas KPI (demo). */
export const demoCustomersSummary = {
  total: demoCustomers.length,
  activos: demoCustomers.filter((c) => c.estado === "activo").length,
  escrowAbiertos: demoTransactions.filter(
    (t) => t.estado === "bloqueado" || t.estado === "pendiente",
  ).length,
  disputasAbiertas: demoTransactions.filter((t) => t.estado === "disputa").length,
};

export const demoTransactionsSummary = {
  total: demoTransactions.length,
  completadas: demoTransactions.filter((t) => t.estado === "completado").length,
  enCurso: demoTransactions.filter(
    (t) => t.estado === "bloqueado" || t.estado === "pendiente",
  ).length,
  disputas: demoTransactions.filter((t) => t.estado === "disputa").length,
};

export function recentTransactionsSorted(): DemoTransaction[] {
  return [...demoTransactions].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );
}
