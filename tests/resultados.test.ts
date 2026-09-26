import { describe, expect, it } from "vitest";
import {
  crearDesafio,
  crearAmistoso,
  responderDesafio,
} from "../src/domain/desafios";
import { obtener } from "../src/domain/estado";
import {
  cargarResultado,
  confirmarTurno,
  corregirResultado,
  marcarInconcluso,
  proponerTurno,
  resolverRevision,
  validarResultado,
} from "../src/domain/partidos";
import { aplicarPuntos } from "../src/domain/puntos";
import { calcularRanking } from "../src/domain/ranking";
import { procesarVencimientos } from "../src/domain/vencimientos";
import { GANA_A, GANA_B, nuevoCircuito, t } from "./fixture";

function dosParejas() {
  const c = nuevoCircuito();
  const a = c.pareja(c.jugador("A1"), c.jugador("A2"));
  const b = c.pareja(c.jugador("B1"), c.jugador("B2"));
  c.habilitar();
  const d = crearDesafio(c.e, a.a.usuario, a.id, b.id, t(0));
  const partido = responderDesafio(c.e, b.a.usuario, d.id, true, t(1))!;
  const turno = {
    inicio: t(24),
    barrioSedeId: "castanos",
    cancha: "Cancha 2",
    reservaGestionadaPorId: a.a.jugadorId,
  };
  return { ...c, a, b, partido, turno, desafio: d };
}

const puntos = (c: ReturnType<typeof dosParejas>, parejaId: string) =>
  calcularRanking(c.e, c.ligaDe()).find((f) => f.parejaId === parejaId)!.puntos;

describe("flujo de resultado", () => {
  it("cargar → validar → 3 puntos al ganador y 1 al perdedor", () => {
    const c = dosParejas();
    proponerTurno(c.e, c.a.a.usuario, c.partido.id, c.turno, t(2));
    confirmarTurno(c.e, c.b.b.usuario, c.partido.id, t(3));
    const r = cargarResultado(c.e, c.b.a.usuario, c.partido.id, GANA_B, t(26));
    expect(puntos(c, c.b.id)).toBe(0); // no suma hasta validarse
    validarResultado(c.e, c.a.b.usuario, r.id, true, "", t(27));
    expect(puntos(c, c.b.id)).toBe(3);
    expect(puntos(c, c.a.id)).toBe(1);
    const fila = calcularRanking(c.e, c.ligaDe())[0]!;
    expect(fila).toMatchObject({
      parejaId: c.b.id,
      posicion: 1,
      jugados: 1,
      ganados: 1,
      perdidos: 0,
    });
    expect(obtener.desafio(c.e, c.desafio.id).estado).toBe("finalizado");
  });

  it("no permite cargar sin turno confirmado ni antes del horario", () => {
    const c = dosParejas();
    expect(() =>
      cargarResultado(c.e, c.a.a.usuario, c.partido.id, GANA_A, t(2)),
    ).toThrow(/turno confirmado/);
    proponerTurno(c.e, c.a.a.usuario, c.partido.id, c.turno, t(2));
    expect(() =>
      confirmarTurno(c.e, c.a.b.usuario, c.partido.id, t(3)),
    ).toThrow(/ya confirmó/);
    confirmarTurno(c.e, c.b.a.usuario, c.partido.id, t(3));
    expect(() =>
      cargarResultado(c.e, c.a.a.usuario, c.partido.id, GANA_A, t(10)),
    ).toThrow(/antes del horario/);
  });

  it("el turno lo gestiona un residente anfitrión que juega el partido, dentro de los 10 días", () => {
    const c = dosParejas();
    const ajeno = c.jugador("Z1");
    expect(() =>
      proponerTurno(
        c.e,
        c.a.a.usuario,
        c.partido.id,
        { ...c.turno, reservaGestionadaPorId: ajeno.jugadorId },
        t(2),
      ),
    ).toThrow(/alguien que juegue/);
    expect(() =>
      proponerTurno(
        c.e,
        c.a.a.usuario,
        c.partido.id,
        { ...c.turno, inicio: t(24 * 12) },
        t(2),
      ),
    ).toThrow(/10 días/);
    expect(() =>
      proponerTurno(
        c.e,
        c.a.a.usuario,
        c.partido.id,
        { ...c.turno, inicio: t(0) },
        t(2),
      ),
    ).toThrow(/futuro/);
  });

  it("evita resultados duplicados y que la misma pareja se valide a sí misma", () => {
    const c = dosParejas();
    proponerTurno(c.e, c.a.a.usuario, c.partido.id, c.turno, t(2));
    confirmarTurno(c.e, c.b.a.usuario, c.partido.id, t(3));
    const r = cargarResultado(c.e, c.a.a.usuario, c.partido.id, GANA_A, t(26));
    expect(() =>
      cargarResultado(c.e, c.b.a.usuario, c.partido.id, GANA_B, t(26)),
    ).toThrow(/ya tiene un resultado/);
    expect(() =>
      validarResultado(c.e, c.a.b.usuario, r.id, true, "", t(27)),
    ).toThrow(/otra pareja/);
    validarResultado(c.e, c.b.b.usuario, r.id, true, "", t(27));
    expect(() =>
      validarResultado(c.e, c.b.a.usuario, r.id, true, "", t(28)),
    ).toThrow(/ya no está esperando/);
    expect(() =>
      aplicarPuntos(
        c.e,
        obtener.partido(c.e, c.partido.id),
        obtener.resultado(c.e, r.id),
        "admin",
        t(29),
      ),
    ).toThrow(/ya asignó puntos/);
    expect(c.e.movimientos).toHaveLength(2);
  });

  it("sin respuesta en 48 h: NO se aprueba solo, pasa a la administración", () => {
    const c = dosParejas();
    proponerTurno(c.e, c.a.a.usuario, c.partido.id, c.turno, t(2));
    confirmarTurno(c.e, c.b.a.usuario, c.partido.id, t(3));
    cargarResultado(c.e, c.a.a.usuario, c.partido.id, GANA_A, t(26));
    procesarVencimientos(c.e, t(26 + 49));
    expect(obtener.partido(c.e, c.partido.id).estado).toBe("en_revision");
    expect(c.e.movimientos).toHaveLength(0);
    // Un jugador no puede resolverlo.
    expect(() =>
      resolverRevision(c.e, c.b.a.usuario, c.partido.id, GANA_A, "ok", t(80)),
    ).toThrow(/permisos/);
    resolverRevision(
      c.e,
      c.admin,
      c.partido.id,
      GANA_A,
      "Confirmado con ambas parejas por teléfono",
      t(80),
    );
    expect(puntos(c, c.a.id)).toBe(3);
    expect(c.e.acciones.some((x) => x.accion === "resolver_revision")).toBe(
      true,
    );
  });

  it("resultado discutido: no suma hasta que se resuelve", () => {
    const c = dosParejas();
    proponerTurno(c.e, c.a.a.usuario, c.partido.id, c.turno, t(2));
    confirmarTurno(c.e, c.b.a.usuario, c.partido.id, t(3));
    const r = cargarResultado(c.e, c.a.a.usuario, c.partido.id, GANA_A, t(26));
    expect(() =>
      validarResultado(c.e, c.b.a.usuario, r.id, false, " ", t(27)),
    ).toThrow(/qué no coincide/);
    validarResultado(
      c.e,
      c.b.a.usuario,
      r.id,
      false,
      "Ganamos nosotros el segundo set",
      t(27),
    );
    expect(obtener.partido(c.e, c.partido.id).estado).toBe("en_revision");
    expect(c.e.movimientos).toHaveLength(0);
    const final = {
      sets: [
        { a: 6, b: 3 },
        { a: 4, b: 6 },
      ],
      superTieBreak: { a: 8, b: 10 },
    };
    resolverRevision(
      c.e,
      c.admin,
      c.partido.id,
      final,
      "Revisado con fotos del marcador",
      t(30),
    );
    expect(puntos(c, c.b.id)).toBe(3);
    expect(puntos(c, c.a.id)).toBe(1);
    expect(obtener.resultado(c.e, r.id).estado).toBe("rechazado_admin");
  });

  it("corrección de un resultado confirmado: revierte, recalcula y conserva historial", () => {
    const c = dosParejas();
    proponerTurno(c.e, c.a.a.usuario, c.partido.id, c.turno, t(2));
    confirmarTurno(c.e, c.b.a.usuario, c.partido.id, t(3));
    const r = cargarResultado(c.e, c.a.a.usuario, c.partido.id, GANA_A, t(26));
    validarResultado(c.e, c.b.a.usuario, r.id, true, "", t(27));
    expect(() =>
      corregirResultado(c.e, c.admin, c.partido.id, GANA_B, "", t(40)),
    ).toThrow(/motivo/);
    expect(() =>
      corregirResultado(c.e, c.a.a.usuario, c.partido.id, GANA_B, "x", t(40)),
    ).toThrow(/permisos/);

    const nuevo = corregirResultado(
      c.e,
      c.admin,
      c.partido.id,
      GANA_B,
      "Error de carga: se invirtieron las parejas",
      t(40),
    );
    expect(puntos(c, c.a.id)).toBe(1);
    expect(puntos(c, c.b.id)).toBe(3);
    expect(nuevo.version).toBe(2);
    expect(obtener.resultado(c.e, r.id).estado).toBe("anulado");
    // 2 originales + 2 reversiones + 2 nuevos: nada se borró.
    expect(c.e.movimientos).toHaveLength(6);
    expect(
      c.e.movimientos
        .filter((m) => m.concepto === "reversion")
        .every((m) => m.revierteId),
    ).toBe(true);
    const log = c.e.acciones.find((x) => x.accion === "corregir_resultado")!;
    expect(log).toMatchObject({
      usuarioId: "admin",
      motivo: "Error de carga: se invirtieron las parejas",
    });
    const fila = calcularRanking(c.e, c.ligaDe()).find(
      (f) => f.parejaId === c.b.id,
    )!;
    expect(fila).toMatchObject({ jugados: 1, ganados: 1 });
  });

  it("partido inconcluso: guarda el marcador, no suma y se completa en otro turno", () => {
    const c = dosParejas();
    proponerTurno(c.e, c.a.a.usuario, c.partido.id, c.turno, t(2));
    confirmarTurno(c.e, c.b.a.usuario, c.partido.id, t(3));
    marcarInconcluso(
      c.e,
      c.b.a.usuario,
      c.partido.id,
      {
        sets: [
          { a: 6, b: 4 },
          { a: 5, b: 5 },
        ],
      },
      t(25.5),
    );
    expect(obtener.partido(c.e, c.partido.id)).toMatchObject({
      estado: "inconcluso",
      marcadorParcial: {
        sets: [
          { a: 6, b: 4 },
          { a: 5, b: 5 },
        ],
      },
    });
    expect(() =>
      cargarResultado(c.e, c.a.a.usuario, c.partido.id, GANA_A, t(26)),
    ).toThrow(/turno confirmado/);
    expect(c.e.movimientos).toHaveLength(0);
    // Nuevo turno para completarlo (aun pasado el plazo original: la extensión está pendiente).
    proponerTurno(
      c.e,
      c.b.a.usuario,
      c.partido.id,
      {
        ...c.turno,
        inicio: t(24 * 12),
        reservaGestionadaPorId: c.b.a.jugadorId,
      },
      t(30),
    );
    confirmarTurno(c.e, c.a.a.usuario, c.partido.id, t(31));
    const r = cargarResultado(
      c.e,
      c.a.a.usuario,
      c.partido.id,
      {
        sets: [
          { a: 6, b: 4 },
          { a: 7, b: 5 },
        ],
      },
      t(24 * 12 + 2),
    );
    validarResultado(c.e, c.b.a.usuario, r.id, true, "", t(24 * 12 + 3));
    expect(puntos(c, c.a.id)).toBe(3);
  });

  it("los amistosos nunca suman puntos", () => {
    const c = nuevoCircuito();
    const a = c.pareja(c.jugador("A1"), c.jugador("A2"));
    const x = c.pareja(c.jugador("X1", "otro"), c.jugador("X2", "otro"));
    const d = crearAmistoso(c.e, a.a.usuario, a.id, x.id, t(0));
    const p = responderDesafio(c.e, x.a.usuario, d.id, true, t(1))!;
    proponerTurno(
      c.e,
      x.a.usuario,
      p.id,
      {
        inicio: t(24),
        barrioSedeId: "otro",
        cancha: "1",
        reservaGestionadaPorId: x.a.jugadorId,
      },
      t(2),
    );
    confirmarTurno(c.e, a.a.usuario, p.id, t(3));
    const r = cargarResultado(c.e, a.a.usuario, p.id, GANA_A, t(26));
    validarResultado(c.e, x.a.usuario, r.id, true, "", t(27));
    expect(obtener.partido(c.e, p.id).estado).toBe("confirmado");
    expect(c.e.movimientos).toHaveLength(0);
  });
});
