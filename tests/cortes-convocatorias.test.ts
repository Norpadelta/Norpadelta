import { describe, expect, it } from "vitest";
import {
  iniciarConvocatoria,
  invitacionActual,
  marcarIncompleta,
  responderConvocatoria,
  siguienteElegible,
} from "../src/domain/convocatorias";
import { disolverPareja } from "../src/domain/parejas";
import { calcularRanking, crearCorte } from "../src/domain/ranking";
import { procesarVencimientos } from "../src/domain/vencimientos";
import { GANA_A, nuevoCircuito, t } from "./fixture";

const COPA = {
  tipo: "copa" as const,
  id: "copa-prueba",
  nombre: "Copa de prueba",
};

/** Ranking sin empates: A 9, B 5, C 3... (A gana 3, B gana 1 y pierde 2, etc.) */
function ligaConRanking() {
  const c = nuevoCircuito();
  const [a, b, cc, d] = ["A", "B", "C", "D"].map((n) =>
    c.pareja(c.jugador(`${n}1`), c.jugador(`${n}2`)),
  );
  c.habilitar();
  c.jugar(a!, b!, GANA_A, 0); // A 3, B 1
  c.jugar(a!, cc!, GANA_A, 30); // A 6, C 1
  c.jugar(a!, d!, GANA_A, 60); // A 9, D 1
  c.jugar(b!, cc!, GANA_A, 90); // B 4, C 2
  c.jugar(b!, d!, GANA_A, 120); // B 7, D 2
  c.jugar(cc!, d!, GANA_A, 150); // C 5, D 3
  return { ...c, a: a!, b: b!, cc: cc!, d: d! };
}

describe("ranking y empates", () => {
  it("empate en puntos = misma posición y marcado como pendiente de desempate", () => {
    const c = nuevoCircuito();
    const [a, b, cc, d] = ["A", "B", "C", "D"].map((n) =>
      c.pareja(c.jugador(`${n}1`), c.jugador(`${n}2`)),
    );
    c.habilitar();
    c.jugar(a!, b!, GANA_A, 0);
    c.jugar(cc!, d!, GANA_A, 30);
    const r = calcularRanking(c.e, c.ligaDe());
    expect(r.map((f) => [f.posicion, f.puntos, f.empatada])).toEqual([
      [1, 3, true],
      [1, 3, true],
      [3, 1, true],
      [3, 1, true],
    ]);
  });
});

describe("cortes", () => {
  it("congela el ranking: los partidos posteriores no lo alteran", () => {
    const c = ligaConRanking();
    const corte = crearCorte(
      c.e,
      c.admin,
      { ligaId: c.ligaDe(), base: "anual", motivo: "Copa de prueba" },
      t(200),
    );
    expect(corte.filas.map((f) => f.puntos)).toEqual([9, 7, 5, 3]);
    c.jugar(c.d, c.a, GANA_A, 24 * 30); // noviembre
    expect(corte.filas.map((f) => f.puntos)).toEqual([9, 7, 5, 3]);
    expect(
      calcularRanking(c.e, c.ligaDe()).find((f) => f.parejaId === c.d.id)!
        .puntos,
    ).toBe(6);
  });

  it("la base del corte se elige explícitamente", () => {
    const c = ligaConRanking();
    expect(() =>
      crearCorte(
        c.e,
        c.admin,
        { ligaId: c.ligaDe(), base: "periodo", motivo: "x" },
        t(200),
      ),
    ).toThrow(/desde cuándo/);
    const corte = crearCorte(
      c.e,
      c.admin,
      {
        ligaId: c.ligaDe(),
        base: "periodo",
        periodoDesde: t(100),
        motivo: "x",
      },
      t(200),
    );
    // Sólo cuentan los partidos jugados desde t(100): B–C (t 114), B–D (t 144) y C–D (t 174).
    expect(
      corte.filas.map((f) => [f.nombrePareja.slice(0, 2), f.puntos]),
    ).toEqual([
      ["B1", 6],
      ["C1", 4],
      ["D1", 2],
      ["A1", 0],
    ]);
    expect(() =>
      crearCorte(
        c.e,
        c.a.a.usuario,
        { ligaId: c.ligaDe(), base: "anual", motivo: "x" },
        t(200),
      ),
    ).toThrow(/permisos/);
  });
});

describe("convocatoria por mérito", () => {
  it("invita al primero; si rechaza, pasa al siguiente en orden", () => {
    const c = ligaConRanking();
    const corte = crearCorte(
      c.e,
      c.admin,
      { ligaId: c.ligaDe(), base: "anual", motivo: "Copa" },
      t(200),
    );
    expect(() =>
      iniciarConvocatoria(
        c.e,
        c.admin,
        { corteId: corte.id, competencia: COPA, plazoHoras: 0 },
        t(200),
      ),
    ).toThrow(/plazo/);
    expect(() =>
      iniciarConvocatoria(
        c.e,
        c.a.a.usuario,
        { corteId: corte.id, competencia: COPA, plazoHoras: 72 },
        t(200),
      ),
    ).toThrow(/administración/);
    const conv = iniciarConvocatoria(
      c.e,
      c.admin,
      { corteId: corte.id, competencia: COPA, plazoHoras: 72 },
      t(200),
    );
    expect(invitacionActual(conv)!.parejaId).toBe(c.a.id);
    expect(siguienteElegible(c.e, conv)!.parejaId).toBe(c.b.id);

    // Otra pareja no puede aceptar por la invitada.
    expect(() =>
      responderConvocatoria(c.e, c.b.a.usuario, conv.id, true, t(201)),
    ).toThrow(/integrantes/);
    responderConvocatoria(c.e, c.a.a.usuario, conv.id, false, t(201));
    expect(invitacionActual(conv)!.parejaId).toBe(c.b.id);
  });

  it("la plaza se cubre cuando confirman los dos integrantes", () => {
    const c = ligaConRanking();
    const corte = crearCorte(
      c.e,
      c.admin,
      { ligaId: c.ligaDe(), base: "anual", motivo: "Copa" },
      t(200),
    );
    const conv = iniciarConvocatoria(
      c.e,
      c.admin,
      { corteId: corte.id, competencia: COPA, plazoHoras: 72 },
      t(200),
    );
    responderConvocatoria(c.e, c.a.a.usuario, conv.id, true, t(201));
    expect(conv.estado).toBe("en_curso");
    responderConvocatoria(c.e, c.a.b.usuario, conv.id, true, t(202));
    expect(conv.estado).toBe("cubierta");
    expect(conv.invitaciones[0]!.estado).toBe("aceptada");
  });

  it("vence el plazo → siguiente; pareja incompleta → siguiente; sin más → sin representante", () => {
    const c = ligaConRanking();
    const corte = crearCorte(
      c.e,
      c.admin,
      { ligaId: c.ligaDe(), base: "anual", motivo: "Copa" },
      t(200),
    );
    disolverPareja(c.e, c.cc.a.usuario, c.cc.id, "Cambio de compañero", t(201)); // 3.º puesto, ya no está completa
    const conv = iniciarConvocatoria(
      c.e,
      c.admin,
      { corteId: corte.id, competencia: COPA, plazoHoras: 48 },
      t(202),
    );

    procesarVencimientos(c.e, t(202 + 49)); // A no confirmó
    expect(invitacionActual(conv)!.parejaId).toBe(c.b.id);

    marcarIncompleta(
      c.e,
      c.admin,
      conv.id,
      "B2 está lesionado y no puede jugar",
      t(260),
    );
    // C se omite por estar disuelta; se invita a D.
    expect(invitacionActual(conv)!.parejaId).toBe(c.d.id);
    expect(conv.invitaciones.map((i) => i.estado)).toEqual([
      "vencida",
      "omitida_incompleta",
      "omitida_incompleta",
      "invitada",
    ]);

    responderConvocatoria(c.e, c.d.b.usuario, conv.id, false, t(261));
    expect(conv.estado).toBe("sin_representante");
  });

  it("si el próximo lugar está empatado, se bloquea hasta definir el desempate", () => {
    const c = nuevoCircuito();
    const [a, b, cc, d] = ["A", "B", "C", "D"].map((n) =>
      c.pareja(c.jugador(`${n}1`), c.jugador(`${n}2`)),
    );
    c.habilitar();
    c.jugar(a!, b!, GANA_A, 0);
    c.jugar(cc!, d!, GANA_A, 30);
    const corte = crearCorte(
      c.e,
      c.admin,
      { ligaId: c.ligaDe(), base: "anual", motivo: "Copa" },
      t(100),
    );
    const conv = iniciarConvocatoria(
      c.e,
      c.admin,
      { corteId: corte.id, competencia: COPA, plazoHoras: 48 },
      t(100),
    );
    expect(conv.estado).toBe("bloqueada_empate");
    expect(conv.invitaciones).toHaveLength(0);
  });
});
