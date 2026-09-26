import { beforeEach, describe, expect, it } from "vitest";
import {
  cuposDePareja,
  crearAmistoso,
  crearDesafio,
  motivosNoElegible,
  responderDesafio,
} from "../src/domain/desafios";
import { obtener } from "../src/domain/estado";
import { calcularRanking } from "../src/domain/ranking";
import { procesarVencimientos } from "../src/domain/vencimientos";
import { GANA_A, nuevoCircuito, t } from "./fixture";

function circuitoConCincoParejas() {
  const c = nuevoCircuito();
  const js = Array.from({ length: 10 }, (_, i) => c.jugador(`J${i}`));
  const ps = Array.from({ length: 5 }, (_, i) =>
    c.pareja(js[2 * i]!, js[2 * i + 1]!),
  );
  c.habilitar();
  return { ...c, ps };
}

describe("elegibilidad de desafíos de liga", () => {
  let c: ReturnType<typeof circuitoConCincoParejas>;
  beforeEach(() => {
    c = circuitoConCincoParejas();
  });

  it("exige mismo barrio, categoría y modalidad", () => {
    const x1 = c.jugador("X1", "otro");
    const x2 = c.jugador("X2", "otro");
    const visitante = c.pareja(x1, x2);
    const [a] = c.ps;
    expect(() =>
      crearDesafio(c.e, a!.a.usuario, a!.id, visitante.id, t(0)),
    ).toThrow(/amistoso/);

    const s1 = c.jugador("S1", "castanos", "sexta");
    const s2 = c.jugador("S2", "castanos", "sexta");
    const sexta = c.pareja(s1, s2);
    expect(() =>
      crearDesafio(c.e, a!.a.usuario, a!.id, sexta.id, t(0)),
    ).toThrow(/categoría y modalidad/);
  });

  it("no permite desafiar si la liga no está habilitada", () => {
    const f1 = c.jugador("F1", "castanos", "septima", ["mixto"]);
    const f2 = c.jugador("F2", "castanos", "septima", ["mixto"]);
    const f3 = c.jugador("F3", "castanos", "septima", ["mixto"]);
    const f4 = c.jugador("F4", "castanos", "septima", ["mixto"]);
    const m1 = c.pareja(f1, f2, "mixto");
    const m2 = c.pareja(f3, f4, "mixto");
    expect(() => crearDesafio(c.e, f1.usuario, m1.id, m2.id, t(0))).toThrow(
      /no está habilitada/,
    );
  });

  it("máximo dos desafíos pendientes, contando los recibidos", () => {
    const [a, b, cc, d] = c.ps;
    crearDesafio(c.e, a!.a.usuario, a!.id, b!.id, t(0));
    crearDesafio(c.e, a!.a.usuario, a!.id, cc!.id, t(0));
    expect(() => crearDesafio(c.e, a!.a.usuario, a!.id, d!.id, t(0))).toThrow(
      /Tu pareja ya tiene 2/,
    );
    // D no puede eludir el límite de A desafiándola a ella.
    expect(() => crearDesafio(c.e, d!.a.usuario, d!.id, a!.id, t(0))).toThrow(
      /El rival ya tiene 2/,
    );
  });

  it("verifica el límite mensual del rival que recibe el desafío", () => {
    const [a, b, cc, d, e5] = c.ps;
    c.jugar(a!, b!, GANA_A, 0);
    c.jugar(a!, cc!, GANA_A, 30);
    c.jugar(a!, d!, GANA_A, 60);
    c.jugar(e5!, a!, GANA_A, 90);
    expect(cuposDePareja(c.e, a!.id, t(120)).puntuablesDelMes).toBe(4);
    // E recibió/jugó 1; B quiere desafiar a A que ya usó sus 4.
    expect(() => crearDesafio(c.e, b!.a.usuario, b!.id, a!.id, t(120))).toThrow(
      /El rival ya usó los 4/,
    );
  });

  it("revalida al aceptar: nadie se pasa del cupo por aceptar", () => {
    const [a, b, cc, d, e5] = c.ps;
    const f = c.pareja(c.jugador("F1"), c.jugador("F2"));
    c.jugar(a!, cc!, GANA_A, 0);
    c.jugar(a!, d!, GANA_A, 30);
    c.jugar(a!, e5!, GANA_A, 60);
    // Con 3 partidos usados, A todavía puede recibir desafíos...
    const deB = crearDesafio(c.e, b!.a.usuario, b!.id, a!.id, t(90));
    const deF = crearDesafio(c.e, f.a.usuario, f.id, a!.id, t(90));
    responderDesafio(c.e, a!.a.usuario, deF.id, true, t(91));
    // ...pero al aceptar el segundo superaría los 4 del mes.
    expect(() =>
      responderDesafio(c.e, a!.a.usuario, deB.id, true, t(92)),
    ).toThrow(/Tu pareja ya usó los 4/);
  });

  it("un mismo rival otorga puntos una vez por mes", () => {
    const [a, b] = c.ps;
    c.jugar(a!, b!, GANA_A, 0);
    expect(
      motivosNoElegible(
        c.e,
        obtener.pareja(c.e, b!.id),
        obtener.pareja(c.e, a!.id),
        t(48),
      ),
    ).toContain(
      "Ya tienen un desafío pendiente o un partido puntuable entre ustedes este mes.",
    );
    // Noviembre: vuelve a ser elegible.
    expect(
      motivosNoElegible(
        c.e,
        obtener.pareja(c.e, b!.id),
        obtener.pareja(c.e, a!.id),
        "2026-11-02T15:00:00.000Z",
      ),
    ).toEqual([]);
  });

  it("el cupo mensual usa la hora de Buenos Aires", () => {
    const [a, b] = c.ps;
    // 31/10 22:00 en Buenos Aires = 1/11 01:00 UTC: sigue siendo octubre.
    const d = crearDesafio(
      c.e,
      a!.a.usuario,
      a!.id,
      b!.id,
      "2026-11-01T00:30:00.000Z",
    );
    responderDesafio(c.e, b!.a.usuario, d.id, true, "2026-11-01T01:00:00.000Z");
    expect(c.e.desafios.find((x) => x.id === d.id)!.mesCupo).toBe("2026-10");
  });
});

describe("vencimientos de desafíos", () => {
  it("48 h sin respuesta: vence, sin puntos ni sanción", () => {
    const c = circuitoConCincoParejas();
    const [a, b] = c.ps;
    const d = crearDesafio(c.e, a!.a.usuario, a!.id, b!.id, t(0));
    expect(() =>
      responderDesafio(c.e, b!.a.usuario, d.id, true, t(49)),
    ).toThrow(/venció/);
    const r = procesarVencimientos(c.e, t(49));
    expect(r.desafiosSinRespuesta).toBe(1);
    expect(obtener.desafio(c.e, d.id).estado).toBe("vencido_sin_respuesta");
    expect(c.e.movimientos).toHaveLength(0);
    expect(cuposDePareja(c.e, a!.id, t(49)).abiertos).toBe(0);
  });

  it("10 días sin turno: vence sin jugar y no adjudica nada", () => {
    const c = circuitoConCincoParejas();
    const [a, b] = c.ps;
    const d = crearDesafio(c.e, a!.a.usuario, a!.id, b!.id, t(0));
    const p = responderDesafio(c.e, b!.a.usuario, d.id, true, t(1))!;
    procesarVencimientos(c.e, t(1 + 24 * 10 + 1));
    expect(obtener.desafio(c.e, d.id).estado).toBe("vencido_sin_jugar");
    expect(obtener.partido(c.e, p.id).estado).toBe("no_disputado");
    expect(c.e.movimientos).toHaveLength(0);
    expect(calcularRanking(c.e, c.ligaDe()).every((f) => f.puntos === 0)).toBe(
      true,
    );
  });

  it("sólo la pareja desafiada puede responder", () => {
    const c = circuitoConCincoParejas();
    const [a, b] = c.ps;
    const d = crearDesafio(c.e, a!.a.usuario, a!.id, b!.id, t(0));
    expect(() => responderDesafio(c.e, a!.b.usuario, d.id, true, t(1))).toThrow(
      /integrantes/,
    );
  });
});

describe("amistosos interbarriales", () => {
  it("se juegan pero no suman puntos en ningún ámbito", () => {
    const c = circuitoConCincoParejas();
    const x1 = c.jugador("X1", "otro");
    const x2 = c.jugador("X2", "otro");
    const visitante = c.pareja(x1, x2);
    const [a] = c.ps;
    const d = crearAmistoso(c.e, a!.a.usuario, a!.id, visitante.id, t(0));
    const p = responderDesafio(c.e, x1.usuario, d.id, true, t(1))!;
    expect(p.tipo).toBe("amistoso");
    expect(cuposDePareja(c.e, a!.id, t(1)).abiertos).toBe(0);
  });
});
