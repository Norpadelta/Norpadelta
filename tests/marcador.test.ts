import { describe, expect, it } from "vitest";
import {
  validarMarcadorFinal,
  validarMarcadorParcial,
  validarSet,
} from "../src/domain/marcador";

describe("sets", () => {
  it.each([
    [{ a: 6, b: 0 }, "a"],
    [{ a: 4, b: 6 }, "b"],
    [{ a: 7, b: 5 }, "a"],
    [{ a: 7, b: 6, tbA: 7, tbB: 5 }, "a"],
    [{ a: 6, b: 7, tbA: 10, tbB: 12 }, "b"],
  ])("acepta %j", (set, ganador) => {
    expect(validarSet(set, 1)).toBe(ganador);
  });

  it.each([
    [{ a: 6, b: 5 }],
    [{ a: 8, b: 6 }],
    [{ a: 7, b: 3 }],
    [{ a: 7, b: 6 }], // falta el tie-break
    [{ a: 7, b: 6, tbA: 7, tbB: 6 }], // sin diferencia de 2
    [{ a: 7, b: 6, tbA: 11, tbB: 7 }], // pasado 7 termina con 2 de ventaja
    [{ a: 7, b: 6, tbA: 5, tbB: 7 }], // el tie-break lo gana quien gana el set
    [{ a: 6, b: 4, tbA: 7, tbB: 2 }], // tie-break sin 7–6
    [{ a: -1, b: 6 }],
    [{ a: 5.5, b: 6 }],
  ])("rechaza %j", (set) => {
    expect(validarSet(set, 1)).toMatch(/Set 1|Tie-break/);
  });
});

describe("partido terminado", () => {
  it("2–0 sin súper tie-break", () => {
    const r = validarMarcadorFinal({
      sets: [
        { a: 6, b: 2 },
        { a: 7, b: 5 },
      ],
    });
    expect(r).toMatchObject({ ok: true, ganador: "a" });
  });

  it("1–1 exige súper tie-break a 10 con diferencia de 2", () => {
    const sets = [
      { a: 6, b: 2 },
      { a: 3, b: 6 },
    ];
    expect(validarMarcadorFinal({ sets }).ok).toBe(false);
    expect(
      validarMarcadorFinal({ sets, superTieBreak: { a: 10, b: 9 } }).ok,
    ).toBe(false);
    expect(
      validarMarcadorFinal({ sets, superTieBreak: { a: 9, b: 7 } }).ok,
    ).toBe(false);
    expect(
      validarMarcadorFinal({ sets, superTieBreak: { a: 14, b: 10 } }).ok,
    ).toBe(false);
    expect(
      validarMarcadorFinal({ sets, superTieBreak: { a: 10, b: 12 } }),
    ).toMatchObject({ ok: true, ganador: "b" });
    expect(
      validarMarcadorFinal({ sets, superTieBreak: { a: 10, b: 4 } }),
    ).toMatchObject({ ok: true, ganador: "a" });
  });

  it("no admite súper tie-break si el partido terminó 2–0", () => {
    expect(
      validarMarcadorFinal({
        sets: [
          { a: 6, b: 2 },
          { a: 6, b: 2 },
        ],
        superTieBreak: { a: 10, b: 2 },
      }).ok,
    ).toBe(false);
  });

  it("no admite tercer set largo ni un solo set", () => {
    expect(validarMarcadorFinal({ sets: [{ a: 6, b: 2 }] }).ok).toBe(false);
    expect(
      validarMarcadorFinal({
        sets: [
          { a: 6, b: 2 },
          { a: 2, b: 6 },
          { a: 6, b: 4 },
        ],
      }).ok,
    ).toBe(false);
  });
});

describe("partido inconcluso", () => {
  it("guarda marcadores alcanzables", () => {
    expect(validarMarcadorParcial({ sets: [{ a: 4, b: 3 }] }).ok).toBe(true);
    expect(
      validarMarcadorParcial({
        sets: [
          { a: 6, b: 3 },
          { a: 6, b: 6 },
        ],
      }).ok,
    ).toBe(true);
    expect(
      validarMarcadorParcial({
        sets: [
          { a: 6, b: 3 },
          { a: 3, b: 6 },
        ],
        superTieBreak: { a: 7, b: 8 },
      }).ok,
    ).toBe(true);
    expect(
      validarMarcadorParcial({
        sets: [
          { a: 6, b: 3 },
          { a: 3, b: 6 },
        ],
      }).ok,
    ).toBe(true);
  });

  it("rechaza un partido terminado o imposible", () => {
    expect(
      validarMarcadorParcial({
        sets: [
          { a: 6, b: 3 },
          { a: 6, b: 1 },
        ],
      }).ok,
    ).toBe(false);
    expect(validarMarcadorParcial({ sets: [{ a: 8, b: 3 }] }).ok).toBe(false);
    expect(
      validarMarcadorParcial({
        sets: [
          { a: 6, b: 3 },
          { a: 3, b: 6 },
        ],
        superTieBreak: { a: 10, b: 3 },
      }).ok,
    ).toBe(false);
    expect(
      validarMarcadorParcial({
        sets: [
          { a: 4, b: 3 },
          { a: 1, b: 0 },
        ],
      }).ok,
    ).toBe(false);
  });
});
