import { estadoVacio, type Estado } from "../src/domain/estado";
import { crearTemporada, habilitarLiga, idLiga } from "../src/domain/ligas";
import { registrarJugador, validarJugador } from "../src/domain/jugadores";
import {
  aprobarPareja,
  invitarCompanero,
  responderInvitacion,
} from "../src/domain/parejas";
import { crearDesafio, responderDesafio } from "../src/domain/desafios";
import {
  cargarResultado,
  confirmarTurno,
  proponerTurno,
  validarResultado,
} from "../src/domain/partidos";
import type {
  Categoria,
  Marcador,
  Modalidad,
  Usuario,
} from "../src/domain/types";
import { sumarHoras } from "../src/domain/tiempo";

export const BASE = "2026-10-05T15:00:00.000Z"; // lunes 5/10/2026, 12:00 en Buenos Aires
export const t = (horas: number) => sumarHoras(BASE, horas);

export const GANA_A: Marcador = {
  sets: [
    { a: 6, b: 3 },
    { a: 6, b: 4 },
  ],
};
export const GANA_B: Marcador = {
  sets: [
    { a: 3, b: 6 },
    { a: 4, b: 6 },
  ],
};

export function nuevoCircuito() {
  const e: Estado = estadoVacio();
  const temporada = crearTemporada(e, 2026, "Temporada 2026");
  e.barrios.push(
    {
      id: "castanos",
      slug: "castanos",
      nombre: "Castaños",
      estado: "piloto",
      sede: { canchas: 2, sistemaReservas: "Basapp", duracionTurnoMin: 90 },
    },
    {
      id: "otro",
      slug: "otro",
      nombre: "Barrio B",
      estado: "en_evaluacion",
      ficticio: true,
      sede: {},
    },
  );
  const admin: Usuario = {
    id: "admin",
    nombre: "Joaco",
    roles: ["admin_general"],
  };
  e.usuarios.push(admin);

  const usuario = (id: string) => e.usuarios.find((u) => u.id === id)!;

  function jugador(
    nombre: string,
    barrioId = "castanos",
    categoria: Categoria = "septima",
    modalidades: Modalidad[] = ["masculino", "mixto"],
  ) {
    const { usuarioId, jugadorId } = registrarJugador(
      e,
      {
        nombre,
        apellido: "Test",
        contacto: `${nombre}@mail.test`,
        barrioId,
        categoria,
        modalidades,
      },
      BASE,
    );
    validarJugador(
      e,
      admin,
      jugadorId,
      { residencia: "validada", categoria },
      BASE,
    );
    return { usuario: usuario(usuarioId), jugadorId };
  }

  function pareja(
    a: ReturnType<typeof jugador>,
    b: ReturnType<typeof jugador>,
    modalidad: Modalidad = "masculino",
  ) {
    const p = invitarCompanero(
      e,
      a.usuario,
      { companeroId: b.jugadorId, modalidad },
      BASE,
    );
    responderInvitacion(e, b.usuario, p.id, true, BASE);
    aprobarPareja(e, admin, p.id, true, "", BASE);
    return { id: p.id, a, b };
  }

  function ligaDe(
    barrioId = "castanos",
    categoria: Categoria = "septima",
    modalidad: Modalidad = "masculino",
  ) {
    return idLiga(temporada, barrioId, categoria, modalidad);
  }

  function habilitar(
    barrioId = "castanos",
    categoria: Categoria = "septima",
    modalidad: Modalidad = "masculino",
  ) {
    habilitarLiga(
      e,
      admin,
      ligaDe(barrioId, categoria, modalidad),
      true,
      "Piloto",
      BASE,
    );
  }

  /** Juega un desafío completo de liga y devuelve el partido. */
  function jugar(
    retadora: ReturnType<typeof pareja>,
    retada: ReturnType<typeof pareja>,
    marcador: Marcador,
    desdeHora = 0,
  ) {
    const d = crearDesafio(
      e,
      retadora.a.usuario,
      retadora.id,
      retada.id,
      t(desdeHora),
    );
    const partido = responderDesafio(
      e,
      retada.a.usuario,
      d.id,
      true,
      t(desdeHora + 1),
    )!;
    proponerTurno(
      e,
      retadora.a.usuario,
      partido.id,
      {
        inicio: t(desdeHora + 24),
        barrioSedeId: "castanos",
        cancha: "Cancha 1",
        reservaGestionadaPorId: retadora.a.jugadorId,
      },
      t(desdeHora + 2),
    );
    confirmarTurno(e, retada.a.usuario, partido.id, t(desdeHora + 3));
    const r = cargarResultado(
      e,
      retadora.a.usuario,
      partido.id,
      marcador,
      t(desdeHora + 26),
    );
    validarResultado(e, retada.b.usuario, r.id, true, "", t(desdeHora + 27));
    return partido;
  }

  return { e, admin, temporada, jugador, pareja, habilitar, ligaDe, jugar };
}
