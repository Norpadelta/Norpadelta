import {
  nuevoId,
  obtener,
  ReglaError,
  registrarAccion,
  type Estado,
} from "./estado";
import { exigirAdminDeBarrio } from "./permisos";
import type { Categoria, Liga, Modalidad, Pareja, Usuario } from "./types";

export function idLiga(
  temporadaId: string,
  barrioId: string,
  categoria: Categoria,
  modalidad: Modalidad,
): string {
  return `${temporadaId}:${barrioId}:${categoria}:${modalidad}`;
}

export function temporadaActual(e: Estado) {
  const t = e.temporadas.find((x) => x.id === e.temporadaActualId);
  if (!t) throw new ReglaError("No hay una temporada activa configurada.");
  return t;
}

/** Devuelve la liga de esa combinación en la temporada, creándola (no habilitada) si no existe. */
export function asegurarLiga(
  e: Estado,
  temporadaId: string,
  barrioId: string,
  categoria: Categoria,
  modalidad: Modalidad,
): Liga {
  const id = idLiga(temporadaId, barrioId, categoria, modalidad);
  let liga = e.ligas.find((l) => l.id === id);
  if (!liga) {
    liga = {
      id,
      temporadaId,
      barrioId,
      categoria,
      modalidad,
      habilitada: false,
    };
    e.ligas.push(liga);
  }
  return liga;
}

export function ligaDePareja(e: Estado, p: Pareja): Liga | undefined {
  if (!e.temporadaActualId) return undefined;
  return e.ligas.find(
    (l) =>
      l.id ===
      idLiga(e.temporadaActualId!, p.barrioId, p.categoria, p.modalidad),
  );
}

export function parejasActivasDeLiga(e: Estado, liga: Liga): Pareja[] {
  return e.parejas.filter(
    (p) =>
      p.estado === "activa" &&
      p.barrioId === liga.barrioId &&
      p.categoria === liga.categoria &&
      p.modalidad === liga.modalidad,
  );
}

/**
 * El mínimo de parejas para abrir una liga está pendiente de reglamento. Hasta
 * que se defina, habilitar una liga es una decisión explícita y registrada.
 */
export function habilitarLiga(
  e: Estado,
  actor: Usuario | null,
  ligaId: string,
  habilitada: boolean,
  motivo: string,
  ahora: string,
) {
  const liga = obtener.liga(e, ligaId);
  exigirAdminDeBarrio(actor, liga.barrioId);
  if (habilitada && parejasActivasDeLiga(e, liga).length < 2)
    throw new ReglaError(
      "No se puede habilitar una liga con menos de dos parejas activas: no habría rivales.",
    );
  if (!motivo.trim()) throw new ReglaError("Indicá el motivo del cambio.");
  liga.habilitada = habilitada;
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: habilitada ? "habilitar_liga" : "suspender_liga",
      entidad: "liga",
      entidadId: ligaId,
      motivo,
    },
    ahora,
  );
}

export function crearTemporada(
  e: Estado,
  anio: number,
  nombre: string,
): string {
  const id = nuevoId(e, "tmp");
  e.temporadas.push({ id, anio, nombre, proximoCorte: null });
  if (!e.temporadaActualId) e.temporadaActualId = id;
  return id;
}
