import { describe, expect, it } from "vitest";
import { crearDesafio } from "../src/domain/desafios";
import { obtener } from "../src/domain/estado";
import { registrarJugador, validarJugador } from "../src/domain/jugadores";
import { habilitarLiga } from "../src/domain/ligas";
import {
  aprobarPareja,
  disolverPareja,
  invitarCompanero,
  responderInvitacion,
} from "../src/domain/parejas";
import { calcularRanking } from "../src/domain/ranking";
import { puedeAdministrarBarrio } from "../src/domain/permisos";
import type { Usuario } from "../src/domain/types";
import { BASE, GANA_A, nuevoCircuito, t } from "./fixture";

describe("registro y parejas", () => {
  it("un jugador nuevo queda pendiente de validación y no puede formar pareja", () => {
    const c = nuevoCircuito();
    const { usuarioId, jugadorId } = registrarJugador(
      c.e,
      {
        nombre: "Ana",
        apellido: "Paz",
        contacto: "11 5555 5555",
        barrioId: "castanos",
        categoria: "octava",
        modalidades: ["femenino"],
      },
      BASE,
    );
    expect(obtener.jugador(c.e, jugadorId).residencia).toBe("pendiente");
    const otra = c.jugador("Bea", "castanos", "octava", ["femenino"]);
    const ana = obtener.usuario(c.e, usuarioId);
    expect(() =>
      invitarCompanero(
        c.e,
        ana,
        { companeroId: otra.jugadorId, modalidad: "femenino" },
        BASE,
      ),
    ).toThrow(/no está validado/);
  });

  it("valida datos mínimos del registro", () => {
    const c = nuevoCircuito();
    const base = {
      nombre: "Ana",
      apellido: "Paz",
      contacto: "x",
      barrioId: "castanos",
      categoria: "octava" as const,
      modalidades: ["femenino" as const],
    };
    expect(() =>
      registrarJugador(c.e, { ...base, contacto: " " }, BASE),
    ).toThrow(/contacto/);
    expect(() =>
      registrarJugador(c.e, { ...base, modalidades: [] }, BASE),
    ).toThrow(/modalidad/);
    expect(() =>
      registrarJugador(c.e, { ...base, barrioId: "inexistente" }, BASE),
    ).toThrow(/barrio/);
  });

  it("invita → confirma → aprueba el admin", () => {
    const c = nuevoCircuito();
    const a = c.jugador("A");
    const b = c.jugador("B");
    const p = invitarCompanero(
      c.e,
      a.usuario,
      { companeroId: b.jugadorId, modalidad: "masculino" },
      BASE,
    );
    expect(p.estado).toBe("invitacion");
    expect(() => responderInvitacion(c.e, a.usuario, p.id, true, BASE)).toThrow(
      /invitada/,
    );
    responderInvitacion(c.e, b.usuario, p.id, true, BASE);
    expect(p.estado).toBe("pendiente_aprobacion");
    expect(() => aprobarPareja(c.e, a.usuario, p.id, true, "", BASE)).toThrow(
      /permisos/,
    );
    aprobarPareja(c.e, c.admin, p.id, true, "", BASE);
    expect(p.estado).toBe("activa");
  });

  it("una pareja por modalidad, pero se puede jugar masculino y mixto", () => {
    const c = nuevoCircuito();
    const a = c.jugador("A", "castanos", "septima", ["masculino", "mixto"]);
    const b = c.jugador("B");
    const d = c.jugador("D");
    const f = c.jugador("F", "castanos", "septima", ["femenino", "mixto"]);
    c.pareja(a, b, "masculino");
    expect(() =>
      invitarCompanero(
        c.e,
        a.usuario,
        { companeroId: d.jugadorId, modalidad: "masculino" },
        BASE,
      ),
    ).toThrow(/una pareja por modalidad/);
    expect(() => c.pareja(a, f, "mixto")).not.toThrow();
  });

  it("parejas de distintos barrios: no se resuelven en silencio", () => {
    const c = nuevoCircuito();
    const a = c.jugador("A");
    const x = c.jugador("X", "otro");
    expect(() =>
      invitarCompanero(
        c.e,
        a.usuario,
        { companeroId: x.jugadorId, modalidad: "masculino" },
        BASE,
      ),
    ).toThrow(/distintos barrios todavía no están reglamentadas/);
  });

  it("cambio de compañero: los puntos quedan en la pareja original y la nueva empieza de cero", () => {
    const c = nuevoCircuito();
    const a1 = c.jugador("A1");
    const a2 = c.jugador("A2");
    const a = c.pareja(a1, a2);
    const b = c.pareja(c.jugador("B1"), c.jugador("B2"));
    c.habilitar();
    c.jugar(a, b, GANA_A, 0);
    disolverPareja(c.e, a1.usuario, a.id, "Se lesionó A2", t(40));
    const nueva = c.pareja(a1, c.jugador("N1"));

    const ranking = calcularRanking(c.e, c.ligaDe());
    expect(ranking.find((f) => f.parejaId === a.id)!.puntos).toBe(3);
    expect(ranking.find((f) => f.parejaId === nueva.id)!.puntos).toBe(0);
    expect(obtener.pareja(c.e, a.id).estado).toBe("disuelta");
    // La pareja disuelta ya no puede desafiar.
    expect(() => crearDesafio(c.e, a1.usuario, a.id, b.id, t(41))).toThrow(
      /activas/,
    );
  });

  it("disolver cancela los desafíos abiertos sin puntos", () => {
    const c = nuevoCircuito();
    const a = c.pareja(c.jugador("A1"), c.jugador("A2"));
    const b = c.pareja(c.jugador("B1"), c.jugador("B2"));
    c.habilitar();
    const d = crearDesafio(c.e, a.a.usuario, a.id, b.id, t(0));
    disolverPareja(c.e, b.a.usuario, b.id, "", t(1));
    expect(obtener.desafio(c.e, d.id).estado).toBe("cancelado");
    expect(c.e.movimientos).toHaveLength(0);
  });
});

describe("permisos", () => {
  it("una liga no se habilita sin rivales ni sin motivo", () => {
    const c = nuevoCircuito();
    c.pareja(c.jugador("A1"), c.jugador("A2"));
    expect(() => c.habilitar()).toThrow(/dos parejas/);
    c.pareja(c.jugador("B1"), c.jugador("B2"));
    expect(() =>
      habilitarLiga(c.e, c.admin, c.ligaDe(), true, "", BASE),
    ).toThrow(/motivo/);
  });

  it("un delegado sólo administra su barrio", () => {
    const c = nuevoCircuito();
    const delegado: Usuario = {
      id: "del",
      nombre: "Delegado",
      roles: ["delegado"],
      barrioDelegadoId: "otro",
    };
    c.e.usuarios.push(delegado);
    expect(puedeAdministrarBarrio(delegado, "otro")).toBe(true);
    expect(puedeAdministrarBarrio(delegado, "castanos")).toBe(false);
    const { jugadorId } = registrarJugador(
      c.e,
      {
        nombre: "Ana",
        apellido: "Paz",
        contacto: "x",
        barrioId: "castanos",
        categoria: "octava",
        modalidades: ["femenino"],
      },
      BASE,
    );
    expect(() =>
      validarJugador(
        c.e,
        delegado,
        jugadorId,
        { residencia: "validada", categoria: "octava" },
        BASE,
      ),
    ).toThrow(/permisos/);
  });

  it("un jugador no puede validar perfiles ni actuar por otra pareja", () => {
    const c = nuevoCircuito();
    const a = c.pareja(c.jugador("A1"), c.jugador("A2"));
    const b = c.pareja(c.jugador("B1"), c.jugador("B2"));
    c.habilitar();
    expect(() =>
      validarJugador(
        c.e,
        a.a.usuario,
        b.a.jugadorId,
        { residencia: "rechazada", categoria: "sexta", motivo: "x" },
        BASE,
      ),
    ).toThrow(/permisos/);
    expect(() => crearDesafio(c.e, a.a.usuario, b.id, a.id, BASE)).toThrow(
      /integrantes/,
    );
    expect(() => crearDesafio(c.e, null, a.id, b.id, BASE)).toThrow(
      /perfil de jugador/,
    );
  });
});
