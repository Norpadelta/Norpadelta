import type {
  AccionAdmin,
  Barrio,
  Convocatoria,
  CorteRanking,
  Desafio,
  Jugador,
  Liga,
  MovimientoPuntos,
  Notificacion,
  Pareja,
  Partido,
  Resultado,
  Temporada,
  Usuario,
} from "./types";

/**
 * Estado completo de la competencia. Los servicios del dominio operan sobre
 * este agregado; el repositorio decide dónde se guarda (memoria en la demo,
 * Postgres en producción, ver db/schema.sql).
 */
export interface Estado {
  seq: number;
  barrios: Barrio[];
  usuarios: Usuario[];
  jugadores: Jugador[];
  parejas: Pareja[];
  temporadas: Temporada[];
  temporadaActualId: string | null;
  ligas: Liga[];
  desafios: Desafio[];
  partidos: Partido[];
  resultados: Resultado[];
  movimientos: MovimientoPuntos[];
  cortes: CorteRanking[];
  convocatorias: Convocatoria[];
  notificaciones: Notificacion[];
  acciones: AccionAdmin[];
}

export function estadoVacio(): Estado {
  return {
    seq: 0,
    barrios: [],
    usuarios: [],
    jugadores: [],
    parejas: [],
    temporadas: [],
    temporadaActualId: null,
    ligas: [],
    desafios: [],
    partidos: [],
    resultados: [],
    movimientos: [],
    cortes: [],
    convocatorias: [],
    notificaciones: [],
    acciones: [],
  };
}

/** Error de regla de negocio: el mensaje se muestra tal cual al usuario. */
export class ReglaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ReglaError";
  }
}

export function nuevoId(e: Estado, prefijo: string): string {
  e.seq += 1;
  return `${prefijo}_${e.seq.toString(36)}`;
}

function buscar<T extends { id: string }>(
  lista: T[],
  id: string | undefined,
  que: string,
): T {
  const x = id ? lista.find((i) => i.id === id) : undefined;
  if (!x) throw new ReglaError(`No encontramos ${que}.`);
  return x;
}

export const obtener = {
  barrio: (e: Estado, id?: string) => buscar(e.barrios, id, "el barrio"),
  usuario: (e: Estado, id?: string) => buscar(e.usuarios, id, "el usuario"),
  jugador: (e: Estado, id?: string) => buscar(e.jugadores, id, "el jugador"),
  pareja: (e: Estado, id?: string) => buscar(e.parejas, id, "la pareja"),
  liga: (e: Estado, id?: string) => buscar(e.ligas, id, "la liga"),
  desafio: (e: Estado, id?: string) => buscar(e.desafios, id, "el desafío"),
  partido: (e: Estado, id?: string) => buscar(e.partidos, id, "el partido"),
  resultado: (e: Estado, id?: string) =>
    buscar(e.resultados, id, "el resultado"),
  convocatoria: (e: Estado, id?: string) =>
    buscar(e.convocatorias, id, "la convocatoria"),
  corte: (e: Estado, id?: string) => buscar(e.cortes, id, "el corte"),
};

export function nombreJugador(e: Estado, id: string): string {
  const j = e.jugadores.find((x) => x.id === id);
  return j ? `${j.nombre} ${j.apellido}` : "—";
}

export function nombrePareja(
  e: Estado,
  p: { jugadorAId: string; jugadorBId: string },
): string {
  const corto = (id: string) => {
    const j = e.jugadores.find((x) => x.id === id);
    return j ? `${j.nombre} ${j.apellido.charAt(0)}.` : "—";
  };
  return `${corto(p.jugadorAId)} / ${corto(p.jugadorBId)}`;
}

export function notificar(
  e: Estado,
  usuarioId: string,
  texto: string,
  ahora: string,
  href?: string,
) {
  e.notificaciones.push({
    id: nuevoId(e, "not"),
    usuarioId,
    texto,
    href,
    creadaEn: ahora,
    leida: false,
  });
}

export function notificarPareja(
  e: Estado,
  parejaId: string,
  texto: string,
  ahora: string,
  href?: string,
) {
  const p = obtener.pareja(e, parejaId);
  for (const jid of [p.jugadorAId, p.jugadorBId]) {
    const j = e.jugadores.find((x) => x.id === jid);
    if (j) notificar(e, j.usuarioId, texto, ahora, href);
  }
}

export function registrarAccion(
  e: Estado,
  a: Omit<AccionAdmin, "id" | "fecha">,
  ahora: string,
) {
  e.acciones.push({ id: nuevoId(e, "acc"), fecha: ahora, ...a });
}
