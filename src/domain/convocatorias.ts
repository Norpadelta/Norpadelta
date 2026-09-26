import {
  notificarPareja,
  nuevoId,
  obtener,
  ReglaError,
  registrarAccion,
  type Estado,
} from "./estado";
import { exigirAdminGeneral, exigirIntegrante } from "./permisos";
import { sumarHoras, vencio } from "./tiempo";
import type { Convocatoria, InvitacionConvocatoria, Usuario } from "./types";

// Convocatoria por mérito (aprobada):
// - Una plaza por barrio, categoría y modalidad.
// - Se invita siguiendo el orden del corte congelado; si la pareja no puede,
//   rechaza, no confirma a tiempo o ya no está completa, se invita a la
//   siguiente. Nadie puede saltear el orden.
// - Clasifica la pareja completa: no se reemplaza a un integrante.
// Pendiente: plazo de confirmación (se fija explícitamente en cada convocatoria)
// y desempates (si el próximo lugar está empatado, la convocatoria se bloquea).

export function invitacionActual(
  c: Convocatoria,
): InvitacionConvocatoria | undefined {
  return c.invitaciones.find((i) => i.estado === "invitada");
}

/** Siguiente pareja del corte que todavía no fue invitada, para mostrar transparencia. */
export function siguienteElegible(e: Estado, c: Convocatoria) {
  const corte = obtener.corte(e, c.corteId);
  const procesadas = new Set(c.invitaciones.map((i) => i.parejaId));
  return corte.filas.find((f) => !procesadas.has(f.parejaId));
}

function avanzar(e: Estado, c: Convocatoria, ahora: string) {
  if (invitacionActual(c)) return;
  const corte = obtener.corte(e, c.corteId);
  const procesadas = new Set(c.invitaciones.map((i) => i.parejaId));
  const pendientes = corte.filas.filter((f) => !procesadas.has(f.parejaId));

  for (const f of pendientes) {
    const pareja = obtener.pareja(e, f.parejaId);
    if (pareja.estado !== "activa") {
      procesadas.add(f.parejaId);
      c.invitaciones.push({
        parejaId: f.parejaId,
        posicionEnCorte: f.posicion,
        estado: "omitida_incompleta",
        invitadaEn: ahora,
        confirmarAntes: ahora,
        confirmaciones: [],
        cerradaEn: ahora,
        motivo: "La pareja ya no está completa.",
      });
      continue;
    }
    // Sin criterio de desempate aprobado no se puede decidir a quién invitar primero.
    const empatadas = pendientes.filter(
      (o) =>
        o.posicion === f.posicion &&
        !procesadas.has(o.parejaId) &&
        obtener.pareja(e, o.parejaId).estado === "activa",
    );
    if (empatadas.length > 1) {
      c.estado = "bloqueada_empate";
      return;
    }
    procesadas.add(f.parejaId);
    c.invitaciones.push({
      parejaId: f.parejaId,
      posicionEnCorte: f.posicion,
      estado: "invitada",
      invitadaEn: ahora,
      confirmarAntes: sumarHoras(ahora, c.plazoHoras),
      confirmaciones: [],
    });
    c.estado = "en_curso";
    notificarPareja(
      e,
      f.parejaId,
      `¡Clasificaron! Están convocados para ${c.competencia.nombre}. Confirmen los dos integrantes dentro de ${c.plazoHoras} h.`,
      ahora,
      "/copas",
    );
    return;
  }
  c.estado = "sin_representante";
}

export function iniciarConvocatoria(
  e: Estado,
  actor: Usuario | null,
  d: {
    corteId: string;
    competencia: Convocatoria["competencia"];
    plazoHoras: number;
    simulada?: boolean;
  },
  ahora: string,
): Convocatoria {
  exigirAdminGeneral(actor);
  const corte = obtener.corte(e, d.corteId);
  const liga = obtener.liga(e, corte.ligaId);
  if (!Number.isFinite(d.plazoHoras) || d.plazoHoras <= 0)
    throw new ReglaError(
      "Fijá el plazo de confirmación (el reglamento todavía no lo define).",
    );
  const repetida = e.convocatorias.some(
    (c) =>
      c.competencia.id === d.competencia.id &&
      c.ligaId === liga.id &&
      c.estado !== "sin_representante",
  );
  if (repetida)
    throw new ReglaError(
      "Ya hay una convocatoria de esta liga para esa competencia.",
    );
  const c: Convocatoria = {
    id: nuevoId(e, "cnv"),
    competencia: d.competencia,
    corteId: corte.id,
    ligaId: liga.id,
    barrioId: liga.barrioId,
    categoria: liga.categoria,
    modalidad: liga.modalidad,
    plazoHoras: d.plazoHoras,
    estado: "en_curso",
    invitaciones: [],
    simulada: d.simulada,
    creadaEn: ahora,
  };
  e.convocatorias.push(c);
  avanzar(e, c, ahora);
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: "iniciar_convocatoria",
      entidad: "convocatoria",
      entidadId: c.id,
      detalle: `${d.competencia.nombre} · plazo ${d.plazoHoras} h`,
    },
    ahora,
  );
  return c;
}

/** Cada integrante confirma. La plaza queda cubierta cuando confirman los dos. */
export function responderConvocatoria(
  e: Estado,
  actor: Usuario | null,
  convocatoriaId: string,
  acepta: boolean,
  ahora: string,
) {
  const c = obtener.convocatoria(e, convocatoriaId);
  const inv = invitacionActual(c);
  if (!inv)
    throw new ReglaError("No hay una invitación abierta en esta convocatoria.");
  const pareja = obtener.pareja(e, inv.parejaId);
  const yo = exigirIntegrante(e, actor, pareja);
  if (vencio(inv.confirmarAntes, ahora))
    throw new ReglaError(
      "El plazo para confirmar venció. La plaza pasa a la siguiente pareja.",
    );
  if (!acepta) {
    cerrar(e, c, inv, "rechazada", "La pareja no puede participar.", ahora);
    return;
  }
  if (!inv.confirmaciones.includes(yo.id)) inv.confirmaciones.push(yo.id);
  if (inv.confirmaciones.length === 2) {
    inv.estado = "aceptada";
    inv.cerradaEn = ahora;
    c.estado = "cubierta";
  }
}

/** Falta un integrante: la oportunidad pasa a la siguiente pareja completa. */
export function marcarIncompleta(
  e: Estado,
  actor: Usuario | null,
  convocatoriaId: string,
  motivo: string,
  ahora: string,
) {
  exigirAdminGeneral(actor);
  const c = obtener.convocatoria(e, convocatoriaId);
  const inv = invitacionActual(c);
  if (!inv) throw new ReglaError("No hay una invitación abierta.");
  if (!motivo.trim())
    throw new ReglaError("Indicá qué integrante falta y por qué.");
  cerrar(e, c, inv, "omitida_incompleta", motivo.trim(), ahora);
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: "convocatoria_pareja_incompleta",
      entidad: "convocatoria",
      entidadId: c.id,
      motivo,
    },
    ahora,
  );
}

function cerrar(
  e: Estado,
  c: Convocatoria,
  inv: InvitacionConvocatoria,
  estado: InvitacionConvocatoria["estado"],
  motivo: string,
  ahora: string,
) {
  inv.estado = estado;
  inv.motivo = motivo;
  inv.cerradaEn = ahora;
  avanzar(e, c, ahora);
}

export function vencerConvocatorias(e: Estado, ahora: string): number {
  let n = 0;
  for (const c of e.convocatorias) {
    const inv = invitacionActual(c);
    if (inv && vencio(inv.confirmarAntes, ahora)) {
      cerrar(e, c, inv, "vencida", "No confirmó dentro del plazo.", ahora);
      n++;
    }
  }
  return n;
}
