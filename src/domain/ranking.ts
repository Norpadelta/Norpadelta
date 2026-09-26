import {
  nombrePareja,
  nuevoId,
  obtener,
  ReglaError,
  registrarAccion,
  type Estado,
} from "./estado";
import { parejasActivasDeLiga } from "./ligas";
import { exigirAdminDeBarrio } from "./permisos";
import type { BaseCorte, CorteRanking, FilaRanking, Usuario } from "./types";

// Ranking de una liga (barrio × categoría × modalidad × temporada).
//
// Los puntos salen del libro de movimientos. Los DESEMPATES están pendientes
// de reglamento: las parejas con los mismos puntos comparten posición y se
// marcan como empatadas. El orden de presentación dentro de un empate es
// alfabético y NO es un criterio deportivo.

export function calcularRanking(
  e: Estado,
  ligaId: string,
  opciones: { desde?: string } = {},
): FilaRanking[] {
  const liga = obtener.liga(e, ligaId);
  const desde = opciones.desde ? new Date(opciones.desde).getTime() : -Infinity;
  const enPeriodo = (iso: string) => new Date(iso).getTime() >= desde;

  const filas = new Map<string, FilaRanking>();
  const fila = (parejaId: string) => {
    let f = filas.get(parejaId);
    if (!f) {
      f = {
        parejaId,
        posicion: 0,
        empatada: false,
        puntos: 0,
        jugados: 0,
        ganados: 0,
        perdidos: 0,
      };
      filas.set(parejaId, f);
    }
    return f;
  };

  for (const p of parejasActivasDeLiga(e, liga)) fila(p.id);
  for (const m of e.movimientos) {
    if (
      m.ambito === "liga" &&
      m.competenciaId === ligaId &&
      enPeriodo(m.fechaPartido)
    )
      fila(m.parejaId).puntos += m.puntos;
  }
  for (const p of e.partidos) {
    if (
      p.tipo !== "liga" ||
      p.ligaId !== ligaId ||
      p.estado !== "confirmado" ||
      !p.turno ||
      !enPeriodo(p.turno.inicio)
    )
      continue;
    const r = obtener.resultado(e, p.resultadoVigenteId);
    for (const id of [r.ganadoraId, r.perdedoraId]) fila(id).jugados += 1;
    fila(r.ganadoraId).ganados += 1;
    fila(r.perdedoraId).perdidos += 1;
  }

  const nombre = (id: string) => nombrePareja(e, obtener.pareja(e, id));
  const orden = [...filas.values()].sort(
    (a, b) =>
      b.puntos - a.puntos ||
      nombre(a.parejaId).localeCompare(nombre(b.parejaId), "es"),
  );
  orden.forEach((f, i) => {
    const anterior = orden[i - 1];
    f.posicion =
      anterior && anterior.puntos === f.puntos ? anterior.posicion : i + 1;
  });
  for (const f of orden)
    f.empatada = orden.some((o) => o !== f && o.puntos === f.puntos);
  return orden;
}

/**
 * Congela el ranking para una convocatoria. La base de puntos (anual o del
 * período) está pendiente de reglamento, así que se elige y queda registrada
 * en cada corte. Los partidos posteriores cuentan para el corte siguiente.
 */
export function crearCorte(
  e: Estado,
  actor: Usuario | null,
  d: { ligaId: string; base: BaseCorte; periodoDesde?: string; motivo: string },
  ahora: string,
): CorteRanking {
  const liga = obtener.liga(e, d.ligaId);
  exigirAdminDeBarrio(actor, liga.barrioId);
  if (!liga.habilitada) throw new ReglaError("La liga no está habilitada.");
  if (d.base !== "anual" && d.base !== "periodo")
    throw new ReglaError("Elegí explícitamente la base del corte.");
  if (d.base === "periodo" && !d.periodoDesde)
    throw new ReglaError("Indicá desde cuándo cuenta el período.");
  if (!d.motivo.trim()) throw new ReglaError("Indicá para qué es el corte.");

  const filas = calcularRanking(e, liga.id, {
    desde: d.base === "periodo" ? d.periodoDesde : undefined,
  }).map((f) => {
    const p = obtener.pareja(e, f.parejaId);
    return {
      ...f,
      nombrePareja: nombrePareja(e, p),
      estadoParejaAlCorte: p.estado,
    };
  });
  const corte: CorteRanking = {
    id: nuevoId(e, "cor"),
    ligaId: liga.id,
    creadoEn: ahora,
    creadoPorUsuarioId: actor!.id,
    base: d.base,
    periodoDesde: d.base === "periodo" ? d.periodoDesde : undefined,
    filas: structuredClone(filas),
    motivo: d.motivo.trim(),
  };
  e.cortes.push(corte);
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: "crear_corte",
      entidad: "liga",
      entidadId: liga.id,
      motivo: d.motivo,
      detalle: `base ${d.base}`,
    },
    ahora,
  );
  return corte;
}
