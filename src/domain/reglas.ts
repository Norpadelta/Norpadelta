// Reglas APROBADAS. Todo lo que no está acá es propuesta o está pendiente:
// ver docs/decisiones-pendientes.md. No agregar valores por defecto para
// reglas pendientes (desempates, base del corte, puntaje de copas, plazo de
// convocatoria, mínimo de parejas por liga, etc.).

export const REGLAS_LIGA = {
  horasParaResponderDesafio: 48,
  diasParaJugarDesafio: 10,
  maxDesafiosAbiertosPorPareja: 2,
  maxPartidosPuntuablesPorMes: 4,
  vecesPorMesQueUnRivalOtorgaPuntos: 1,
  puntosVictoria: 3,
  puntosDerrota: 1,
} as const;

export const REGLAS_RESULTADOS = {
  horasParaValidar: 48,
} as const;

export const FORMATO_PARTIDO = {
  duracionTurnoMin: 90,
  entradaEnCalorMin: 5,
  setsAlMejorDe: 2,
  gamesPorSet: 6,
  tieBreakA: 7,
  superTieBreakA: 10,
  diferenciaMinima: 2,
  puntoDeOro: true,
} as const;

export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
