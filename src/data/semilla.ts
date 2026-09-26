import {
  crearAmistoso,
  crearDesafio,
  responderDesafio,
} from "@/domain/desafios";
import { estadoVacio, type Estado } from "@/domain/estado";
import { registrarJugador, validarJugador } from "@/domain/jugadores";
import { crearTemporada, habilitarLiga, idLiga } from "@/domain/ligas";
import {
  aprobarPareja,
  invitarCompanero,
  responderInvitacion,
} from "@/domain/parejas";
import {
  cargarResultado,
  confirmarTurno,
  proponerTurno,
  validarResultado,
} from "@/domain/partidos";
import { sumarHoras } from "@/domain/tiempo";
import type { Categoria, Marcador, Modalidad, Usuario } from "@/domain/types";

// Datos de la DEMO. Todas las personas, parejas y partidos son FICTICIOS.
// Lo único real es la información confirmada de Castaños (dos canchas, sin
// costo para residentes, reservas por Basapp, turnos de 90 minutos) y el rol
// de administrador general inicial.
//
// La historia se genera con los mismos servicios del dominio, "viajando en el
// tiempo" hacia atrás, así que respeta todas las reglas aprobadas.

export const ID_ADMIN = "usr_admin";

export function crearSemilla(ahoraIso: string): Estado {
  const e = estadoVacio();
  const h = (horas: number) => sumarHoras(ahoraIso, horas);
  const temporada = crearTemporada(e, 2026, "Temporada 2026");

  e.barrios.push(
    {
      id: "castanos",
      slug: "castanos",
      nombre: "Castaños",
      estado: "piloto",
      sede: {
        sistemaReservas: "Basapp",
        canchas: 2,
        duracionTurnoMin: 90,
        costos: "Sin costo para residentes",
      },
    },
    {
      id: "barrio-demo",
      slug: "barrio-demo",
      nombre: "Barrio Demo",
      estado: "en_evaluacion",
      ficticio: true,
      sede: {},
    },
  );

  const admin: Usuario = {
    id: ID_ADMIN,
    nombre: "Joaquín (Joaco)",
    roles: ["admin_general"],
  };
  e.usuarios.push(admin);

  const inicio = h(-240);
  const jugador = (
    nombre: string,
    apellido: string,
    categoria: Categoria,
    modalidades: Modalidad[],
    barrioId = "castanos",
    validar = true,
  ) => {
    const { usuarioId, jugadorId } = registrarJugador(
      e,
      {
        nombre,
        apellido,
        contacto: `demo+${nombre.toLowerCase()}@norpadelta.test`,
        barrioId,
        categoria,
        modalidades,
      },
      inicio,
    );
    e.usuarios.find((u) => u.id === usuarioId)!.ficticio = true;
    e.jugadores.find((j) => j.id === jugadorId)!.ficticio = true;
    if (validar)
      validarJugador(
        e,
        admin,
        jugadorId,
        { residencia: "validada", categoria },
        inicio,
      );
    return { u: e.usuarios.find((u) => u.id === usuarioId)!, id: jugadorId };
  };
  type J = ReturnType<typeof jugador>;
  const pareja = (a: J, b: J, modalidad: Modalidad, aprobar = true) => {
    const p = invitarCompanero(
      e,
      a.u,
      { companeroId: b.id, modalidad },
      inicio,
    );
    responderInvitacion(e, b.u, p.id, true, inicio);
    if (aprobar) aprobarPareja(e, admin, p.id, true, "", inicio);
    return { id: p.id, a, b };
  };

  // ------------------------------------------------------------ Castaños
  const tomas = jugador("Tomás", "Ríos", "septima", ["masculino", "mixto"]);
  const nico = jugador("Nico", "Vega", "septima", ["masculino"]);
  const martin = jugador("Martín", "Sosa", "septima", ["masculino"]);
  const lucas = jugador("Lucas", "Paz", "septima", ["masculino", "mixto"]);
  const diego = jugador("Diego", "Luna", "septima", ["masculino"]);
  const facu = jugador("Facu", "Mena", "septima", ["masculino"]);
  const juan = jugador("Juan", "Ortiz", "septima", ["masculino"]);
  const pablo = jugador("Pablo", "Gil", "septima", ["masculino"]);
  const santi = jugador("Santi", "Rey", "septima", ["masculino"]);
  const bruno = jugador("Bruno", "Díaz", "septima", ["masculino"]);
  const valen = jugador("Valen", "Ruiz", "septima", ["mixto", "femenino"]);
  const sofi = jugador("Sofi", "Mena", "septima", ["mixto"]);
  const carla = jugador("Carla", "Díaz", "octava", ["femenino"]);
  const juli = jugador("Juli", "Sosa", "octava", ["femenino"]);
  const pedro = jugador("Pedro", "Rey", "septima", ["masculino"]);
  const gonza = jugador("Gonza", "Ibarra", "septima", ["masculino"]);
  jugador("Ana", "Gómez", "octava", ["femenino"], "castanos", false); // espera validación

  const p1 = pareja(tomas, nico, "masculino");
  const p2 = pareja(martin, lucas, "masculino");
  const p3 = pareja(diego, facu, "masculino");
  const p4 = pareja(juan, pablo, "masculino");
  const p5 = pareja(santi, bruno, "masculino");
  pareja(tomas, valen, "mixto");
  pareja(lucas, sofi, "mixto");
  pareja(carla, juli, "femenino");
  pareja(pedro, gonza, "masculino", false); // espera aprobación

  habilitarLiga(
    e,
    admin,
    idLiga(temporada, "castanos", "septima", "masculino"),
    true,
    "Piloto Castaños: primera liga habilitada",
    inicio,
  );

  // --------------------------------------------------------- Barrio Demo
  const d1 = pareja(
    jugador("Ramiro", "Soto", "septima", ["masculino"], "barrio-demo"),
    jugador("Iván", "Cruz", "septima", ["masculino"], "barrio-demo"),
    "masculino",
  );
  pareja(
    jugador("Leo", "Funes", "septima", ["masculino"], "barrio-demo"),
    jugador("Emi", "Toledo", "septima", ["masculino"], "barrio-demo"),
    "masculino",
  );

  // ------------------------------------------------------------ Historia
  type P = typeof p1;
  const acordar = (ret: P, rival: P, desde: number, turnoEn: number) => {
    const d = crearDesafio(e, ret.a.u, ret.id, rival.id, h(desde));
    const partido = responderDesafio(e, rival.a.u, d.id, true, h(desde + 1))!;
    proponerTurno(
      e,
      ret.a.u,
      partido.id,
      {
        inicio: h(turnoEn),
        barrioSedeId: "castanos",
        cancha: turnoEn % 2 === 0 ? "Cancha 1" : "Cancha 2",
        reservaGestionadaPorId: ret.a.id,
      },
      h(desde + 2),
    );
    return partido;
  };
  const jugar = (
    ret: P,
    rival: P,
    desde: number,
    marcador: Marcador,
    validar = true,
  ) => {
    const partido = acordar(ret, rival, desde, desde + 30);
    confirmarTurno(e, rival.b.u, partido.id, h(desde + 3));
    const r = cargarResultado(e, ret.a.u, partido.id, marcador, h(desde + 32));
    if (validar) validarResultado(e, rival.b.u, r.id, true, "", h(desde + 33));
    return { partido, r };
  };

  jugar(p2, p3, -230, {
    sets: [
      { a: 6, b: 4 },
      { a: 6, b: 3 },
    ],
  });
  jugar(p1, p4, -200, {
    sets: [
      { a: 7, b: 6, tbA: 7, tbB: 4 },
      { a: 6, b: 2 },
    ],
  });
  jugar(p5, p3, -150, {
    sets: [
      { a: 6, b: 3 },
      { a: 3, b: 6 },
    ],
    superTieBreak: { a: 10, b: 7 },
  });

  // Resultado discutido: lo resuelve la administración.
  const discutido = jugar(
    p4,
    p2,
    -100,
    {
      sets: [
        { a: 6, b: 4 },
        { a: 6, b: 4 },
      ],
    },
    false,
  );
  validarResultado(
    e,
    p2.a.u,
    discutido.r.id,
    false,
    "El segundo set fue 7–5 para nosotros.",
    h(-60),
  );

  // Tomás tiene que validar este resultado (48 h).
  const aValidar = acordar(p3, p1, -80, -52);
  confirmarTurno(e, tomas.u, aValidar.id, h(-78));
  cargarResultado(
    e,
    diego.u,
    aValidar.id,
    {
      sets: [
        { a: 6, b: 4 },
        { a: 4, b: 6 },
      ],
      superTieBreak: { a: 10, b: 8 },
    },
    h(-20),
  );

  // Turno propuesto, esperando que el rival lo confirme.
  acordar(p5, p4, -40, 30);

  // Desafío recibido por Tomás y su pareja, sin responder.
  crearDesafio(e, martin.u, p2.id, p1.id, h(-5));

  // Invitación a amistoso desde un barrio ficticio: no suma puntos.
  crearAmistoso(e, d1.a.u, d1.id, p1.id, h(-10));

  e.notificaciones = e.notificaciones.filter((n) => n.creadaEn > h(-72));
  return e;
}
