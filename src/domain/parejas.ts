import {
  nombreJugador,
  notificar,
  notificarPareja,
  nuevoId,
  obtener,
  ReglaError,
  registrarAccion,
  type Estado,
} from "./estado";
import { asegurarLiga } from "./ligas";
import {
  esAdminGeneral,
  exigirAdminDeBarrio,
  exigirIntegrante,
  jugadorDe,
} from "./permisos";
import type { Categoria, Modalidad, Pareja, Usuario } from "./types";

const VIGENTES: Pareja["estado"][] = [
  "invitacion",
  "pendiente_aprobacion",
  "activa",
];

/** Pareja vigente (invitada, por aprobar o activa) de un jugador en una modalidad. */
export function parejaVigente(
  e: Estado,
  jugadorId: string,
  modalidad: Modalidad,
): Pareja | undefined {
  return e.parejas.find(
    (p) =>
      p.modalidad === modalidad &&
      VIGENTES.includes(p.estado) &&
      (p.jugadorAId === jugadorId || p.jugadorBId === jugadorId),
  );
}

export function parejasDeJugador(e: Estado, jugadorId: string): Pareja[] {
  return e.parejas.filter(
    (p) => p.jugadorAId === jugadorId || p.jugadorBId === jugadorId,
  );
}

/** Un jugador invita a otro. La pareja representa a un barrio, en una modalidad. */
export function invitarCompanero(
  e: Estado,
  actor: Usuario | null,
  d: { companeroId: string; modalidad: Modalidad; categoria?: Categoria },
  ahora: string,
): Pareja {
  const yo = jugadorDe(e, actor);
  const otro = obtener.jugador(e, d.companeroId);
  if (otro.id === yo.id)
    throw new ReglaError("No podés formar pareja con vos mismo.");
  if (yo.residencia !== "validada")
    throw new ReglaError("Tu perfil todavía no está validado.");
  if (otro.residencia !== "validada")
    throw new ReglaError(
      `${nombreJugador(e, otro.id)} todavía no tiene el perfil validado.`,
    );
  if (otro.barrioId !== yo.barrioId)
    throw new ReglaError(
      "Las parejas de residentes de distintos barrios todavía no están reglamentadas. Por ahora cada pareja se forma dentro del mismo barrio.",
    );
  for (const j of [yo, otro]) {
    if (!j.modalidades.includes(d.modalidad))
      throw new ReglaError(
        `${nombreJugador(e, j.id)} no juega en la modalidad ${d.modalidad}.`,
      );
    if (parejaVigente(e, j.id, d.modalidad))
      throw new ReglaError(
        `${nombreJugador(e, j.id)} ya tiene una pareja en ${d.modalidad}: una pareja por modalidad.`,
      );
  }
  const p: Pareja = {
    id: nuevoId(e, "par"),
    jugadorAId: yo.id,
    jugadorBId: otro.id,
    barrioId: yo.barrioId,
    // Si las categorías difieren, el administrador lo revisa al aprobar.
    categoria: d.categoria ?? yo.categoria,
    modalidad: d.modalidad,
    estado: "invitacion",
    creadaEn: ahora,
  };
  e.parejas.push(p);
  notificar(
    e,
    otro.usuarioId,
    `${nombreJugador(e, yo.id)} te invitó a formar pareja (${d.modalidad}).`,
    ahora,
    "/parejas",
  );
  return p;
}

export function responderInvitacion(
  e: Estado,
  actor: Usuario | null,
  parejaId: string,
  acepta: boolean,
  ahora: string,
) {
  const p = obtener.pareja(e, parejaId);
  const yo = jugadorDe(e, actor);
  if (p.jugadorBId !== yo.id)
    throw new ReglaError("Sólo la persona invitada puede responder.");
  if (p.estado !== "invitacion")
    throw new ReglaError("Esta invitación ya fue respondida.");
  if (acepta) {
    const otra = parejaVigente(e, yo.id, p.modalidad);
    if (otra && otra.id !== p.id)
      throw new ReglaError(`Ya tenés una pareja en ${p.modalidad}.`);
    p.estado = "pendiente_aprobacion";
    p.confirmadaEn = ahora;
  } else {
    p.estado = "rechazada";
  }
  const invitante = obtener.jugador(e, p.jugadorAId);
  notificar(
    e,
    invitante.usuarioId,
    acepta
      ? `${nombreJugador(e, yo.id)} confirmó la pareja. Falta la aprobación de la administración.`
      : `${nombreJugador(e, yo.id)} rechazó la invitación.`,
    ahora,
    "/parejas",
  );
}

export function aprobarPareja(
  e: Estado,
  actor: Usuario | null,
  parejaId: string,
  aprueba: boolean,
  motivo: string,
  ahora: string,
) {
  const p = obtener.pareja(e, parejaId);
  exigirAdminDeBarrio(actor, p.barrioId);
  if (p.estado !== "pendiente_aprobacion")
    throw new ReglaError("La pareja no está esperando aprobación.");
  if (!aprueba && !motivo.trim())
    throw new ReglaError("Indicá el motivo del rechazo.");
  p.estado = aprueba ? "activa" : "rechazada";
  if (aprueba) {
    p.aprobadaEn = ahora;
    if (e.temporadaActualId)
      asegurarLiga(
        e,
        e.temporadaActualId,
        p.barrioId,
        p.categoria,
        p.modalidad,
      );
  }
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: aprueba ? "aprobar_pareja" : "rechazar_pareja",
      entidad: "pareja",
      entidadId: p.id,
      motivo,
    },
    ahora,
  );
  notificarPareja(
    e,
    p.id,
    aprueba
      ? "¡Tu pareja fue aprobada! Ya podés entrar a tu liga."
      : "La pareja no fue aprobada.",
    ahora,
    "/mi-liga",
  );
}

/**
 * Cambio de compañero: la pareja se disuelve y conserva sus puntos e
 * historial. La nueva pareja empieza de cero; nunca se transfieren puntos.
 */
export function disolverPareja(
  e: Estado,
  actor: Usuario | null,
  parejaId: string,
  motivo: string,
  ahora: string,
) {
  const p = obtener.pareja(e, parejaId);
  if (!esAdminGeneral(actor)) exigirIntegrante(e, actor, p);
  if (p.estado !== "activa")
    throw new ReglaError("Sólo se puede disolver una pareja activa.");

  const partidos = e.partidos.filter(
    (m) => m.parejaAId === p.id || m.parejaBId === p.id,
  );
  const bloqueante = partidos.find((m) =>
    ["inconcluso", "resultado_cargado", "en_revision"].includes(m.estado),
  );
  if (bloqueante)
    throw new ReglaError(
      "Tenés un partido inconcluso o un resultado sin validar. Resolvelo antes de cambiar de pareja.",
    );

  // Desafíos abiertos: se cancelan sin puntos para nadie.
  for (const d of e.desafios) {
    if (
      (d.retadoraId === p.id || d.retadaId === p.id) &&
      (d.estado === "pendiente" || d.estado === "aceptado")
    ) {
      d.estado = "cancelado";
      const rival = d.retadoraId === p.id ? d.retadaId : d.retadoraId;
      notificarPareja(
        e,
        rival,
        "Un desafío se canceló porque la otra pareja se disolvió.",
        ahora,
        "/mis-partidos",
      );
    }
  }
  for (const m of partidos) {
    if (["por_coordinar", "turno_propuesto", "programado"].includes(m.estado))
      m.estado = "cancelado";
  }
  p.estado = "disuelta";
  p.disueltaEn = ahora;
  p.motivoDisolucion = motivo.trim() || "Cambio de compañero";
  if (esAdminGeneral(actor))
    registrarAccion(
      e,
      {
        usuarioId: actor!.id,
        accion: "disolver_pareja",
        entidad: "pareja",
        entidadId: p.id,
        motivo,
      },
      ahora,
    );
}
