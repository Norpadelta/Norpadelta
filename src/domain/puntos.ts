import { nuevoId, obtener, ReglaError, type Estado } from "./estado";
import { REGLAS_LIGA as R } from "./reglas";
import type { MovimientoPuntos, Partido, Resultado } from "./types";

// Libro de puntos. Los totales nunca se editan: se agregan movimientos.
// Una corrección revierte los movimientos del resultado anterior y crea los
// del nuevo, de modo que todo punto es trazable a un partido y un resultado.

export function movimientosDe(e: Estado, resultadoId: string) {
  return e.movimientos.filter((m) => m.resultadoId === resultadoId);
}

/** Asigna los puntos de un resultado confirmado. Idempotente por resultado. */
export function aplicarPuntos(
  e: Estado,
  partido: Partido,
  resultado: Resultado,
  usuarioId: string,
  ahora: string,
): MovimientoPuntos[] {
  if (resultado.estado !== "confirmado")
    throw new ReglaError("Sólo un resultado confirmado suma puntos.");
  if (movimientosDe(e, resultado.id).length > 0)
    throw new ReglaError("Este resultado ya asignó puntos.");
  // Amistosos: no suman. Copas y Mundial: su fórmula está pendiente de reglamento.
  if (partido.tipo !== "liga") return [];
  if (!partido.ligaId || !partido.turno)
    throw new ReglaError("El partido de liga no tiene liga o turno.");

  const crear = (
    parejaId: string,
    puntos: number,
    concepto: "victoria" | "derrota",
  ): MovimientoPuntos => ({
    id: nuevoId(e, "mov"),
    ambito: "liga",
    competenciaId: partido.ligaId!,
    parejaId,
    barrioId: obtener.pareja(e, parejaId).barrioId,
    puntos,
    concepto,
    partidoId: partido.id,
    resultadoId: resultado.id,
    fechaPartido: partido.turno!.inicio,
    creadoEn: ahora,
    creadoPorUsuarioId: usuarioId,
  });
  const nuevos = [
    crear(resultado.ganadoraId, R.puntosVictoria, "victoria"),
    crear(resultado.perdedoraId, R.puntosDerrota, "derrota"),
  ];
  e.movimientos.push(...nuevos);
  return nuevos;
}

/** Revierte los puntos de un resultado (por corrección). Idempotente. */
export function revertirPuntos(
  e: Estado,
  resultadoId: string,
  usuarioId: string,
  ahora: string,
): MovimientoPuntos[] {
  const originales = movimientosDe(e, resultadoId).filter(
    (m) => m.concepto !== "reversion",
  );
  const reversiones: MovimientoPuntos[] = [];
  for (const m of originales) {
    if (e.movimientos.some((x) => x.revierteId === m.id)) continue;
    reversiones.push({
      ...m,
      id: nuevoId(e, "mov"),
      puntos: -m.puntos,
      concepto: "reversion",
      revierteId: m.id,
      creadoEn: ahora,
      creadoPorUsuarioId: usuarioId,
    });
  }
  e.movimientos.push(...reversiones);
  return reversiones;
}
