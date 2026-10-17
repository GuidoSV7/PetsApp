export type BusinessMetricRow = {
  businessId: string;
  paymentCount: number;
  volumeLamports: string;
};

export type BusinessMetricsAggregate = {
  totalPayments: number;
  volumeLamports: bigint;
  businessesWithActivity: number;
  totalBusinesses: number;
};

/** Vacío / undefined = todos los negocios del comercio. */
export function filterMetricRowsByBusiness<T extends { businessId: string }>(
  filas: T[],
  negocioId: string | undefined,
): T[] {
  const id = negocioId?.trim();
  if (!id) return filas;
  return filas.filter((f) => f.businessId === id);
}

export function aggregateBusinessMetricRows(
  filas: BusinessMetricRow[],
): BusinessMetricsAggregate {
  let totalPayments = 0;
  let volumeLamports = 0n;
  for (const row of filas) {
    totalPayments += row.paymentCount;
    volumeLamports += BigInt(row.volumeLamports || "0");
  }
  return {
    totalPayments,
    volumeLamports,
    businessesWithActivity: filas.filter((x) => x.paymentCount > 0).length,
    totalBusinesses: filas.length,
  };
}
