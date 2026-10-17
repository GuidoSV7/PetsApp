import { describe, expect, it } from "vitest";
import {
  aggregateBusinessMetricRows,
  filterMetricRowsByBusiness,
} from "@/features/merchant-analytics/analytics-business-filter";

const FILAS = [
  {
    businessId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    paymentCount: 2,
    volumeLamports: "1000",
  },
  {
    businessId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    paymentCount: 3,
    volumeLamports: "4000",
  },
];

describe("filterMetricRowsByBusiness", () => {
  it("sin id devuelve todas las filas", () => {
    expect(filterMetricRowsByBusiness(FILAS, undefined)).toEqual(FILAS);
    expect(filterMetricRowsByBusiness(FILAS, "")).toEqual(FILAS);
  });

  it("con id deja solo ese negocio", () => {
    expect(filterMetricRowsByBusiness(FILAS, FILAS[0].businessId)).toEqual([FILAS[0]]);
  });
});

describe("aggregateBusinessMetricRows", () => {
  it("suma pagos y volumen de las filas dadas", () => {
    const r = aggregateBusinessMetricRows(FILAS);
    expect(r.totalPayments).toBe(5);
    expect(r.volumeLamports).toBe(5000n);
    expect(r.businessesWithActivity).toBe(2);
    expect(r.totalBusinesses).toBe(2);
  });

  it("tras filtrar un negocio, el agregado es solo ese", () => {
    const r = aggregateBusinessMetricRows(
      filterMetricRowsByBusiness(FILAS, FILAS[1].businessId),
    );
    expect(r.totalPayments).toBe(3);
    expect(r.volumeLamports).toBe(4000n);
    expect(r.totalBusinesses).toBe(1);
  });
});
