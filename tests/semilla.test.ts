import { describe, expect, it } from "vitest";
import { crearSemilla } from "../src/data/semilla";
import { calcularRanking } from "../src/domain/ranking";
import { procesarVencimientos } from "../src/domain/vencimientos";

// La demo se genera con los servicios reales: si alguna regla cambia y la
// historia deja de ser válida, este test lo detecta.
describe("semilla de la demo", () => {
  it.each([
    "2026-09-26T15:00:00.000Z",
    "2026-10-01T03:30:00.000Z",
    "2026-12-31T23:00:00.000Z",
  ])("es válida al %s", (ahora) => {
    const e = crearSemilla(ahora);
    procesarVencimientos(e, ahora);
    const liga = e.ligas.find((l) => l.habilitada)!;
    const ranking = calcularRanking(e, liga.id);
    expect(ranking.map((f) => f.puntos)).toEqual([3, 3, 3, 2, 1]);
    expect(e.partidos.filter((p) => p.estado === "en_revision")).toHaveLength(
      1,
    );
    expect(
      e.resultados.filter((r) => r.estado === "pendiente_validacion"),
    ).toHaveLength(1);
    expect(e.jugadores.every((j) => j.ficticio)).toBe(true);
    expect(e.barrios.filter((b) => !b.ficticio).map((b) => b.nombre)).toEqual([
      "Castaños",
    ]);
  });
});
