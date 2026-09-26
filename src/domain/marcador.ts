import { FORMATO_PARTIDO as F } from "./reglas";
import type { Marcador, SetJugado } from "./types";

// Validación del formato aprobado:
// - Dos sets a seis games; tie-break a 7 (diferencia de 2) en 6–6.
// - Punto de oro en 40–40 (no afecta la validación del marcador).
// - Si quedan un set iguales: súper tie-break a 10 (diferencia de 2).

export type Lado = "a" | "b";

export type ResultadoValidacion =
  | { ok: true; ganador: Lado; resumen: string }
  | { ok: false; error: string };

function esEntero(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

/** Valida un desempate "a N puntos con diferencia de 2". Devuelve el ganador o un error. */
function validarDesempate(
  a: number,
  b: number,
  objetivo: number,
  nombre: string,
): Lado | string {
  if (!esEntero(a) || !esEntero(b))
    return `${nombre}: los puntos deben ser números enteros.`;
  const w = Math.max(a, b);
  const l = Math.min(a, b);
  if (w < objetivo)
    return `${nombre}: el ganador necesita al menos ${objetivo} puntos.`;
  if (w - l < F.diferenciaMinima)
    return `${nombre}: se gana con ${F.diferenciaMinima} puntos de diferencia.`;
  if (w > objetivo && w - l !== F.diferenciaMinima)
    return `${nombre}: pasado ${objetivo}, termina apenas alguien saca ${F.diferenciaMinima} de ventaja.`;
  return a > b ? "a" : "b";
}

/** Valida un set terminado. Devuelve el ganador o un mensaje de error. */
export function validarSet(s: SetJugado, n: number): Lado | string {
  const nombre = `Set ${n}`;
  if (!esEntero(s.a) || !esEntero(s.b))
    return `${nombre}: los games deben ser números enteros.`;
  const w = Math.max(s.a, s.b);
  const l = Math.min(s.a, s.b);
  const ganador: Lado = s.a > s.b ? "a" : "b";
  const hayTb = s.tbA !== undefined || s.tbB !== undefined;

  if (w === F.gamesPorSet && l <= F.gamesPorSet - 2) {
    if (hayTb)
      return `${nombre}: sólo hay tie-break cuando el set termina 7–6.`;
    return ganador;
  }
  if (w === F.gamesPorSet + 1 && l === F.gamesPorSet - 1) {
    if (hayTb)
      return `${nombre}: sólo hay tie-break cuando el set termina 7–6.`;
    return ganador;
  }
  if (w === F.gamesPorSet + 1 && l === F.gamesPorSet) {
    if (s.tbA === undefined || s.tbB === undefined)
      return `${nombre}: terminó 7–6, cargá el resultado del tie-break.`;
    const tb = validarDesempate(
      s.tbA,
      s.tbB,
      F.tieBreakA,
      `Tie-break del set ${n}`,
    );
    if (tb !== "a" && tb !== "b") return tb;
    if (tb !== ganador)
      return `${nombre}: el tie-break lo tiene que ganar la pareja que ganó el set.`;
    return ganador;
  }
  return `${nombre}: ${s.a}–${s.b} no es un resultado posible de un set a ${F.gamesPorSet} games.`;
}

/** Valida un partido terminado según el formato aprobado. */
export function validarMarcadorFinal(m: Marcador): ResultadoValidacion {
  if (!m || !Array.isArray(m.sets) || m.sets.length !== 2)
    return {
      ok: false,
      error:
        "Un partido terminado tiene exactamente dos sets (más súper tie-break si quedan 1–1).",
    };
  const ganadores: Lado[] = [];
  for (let i = 0; i < 2; i++) {
    const g = validarSet(m.sets[i]!, i + 1);
    if (g !== "a" && g !== "b") return { ok: false, error: g };
    ganadores.push(g);
  }
  if (ganadores[0] === ganadores[1]) {
    if (m.superTieBreak)
      return {
        ok: false,
        error: "No hay súper tie-break si una pareja ganó los dos sets.",
      };
    return { ok: true, ganador: ganadores[0]!, resumen: resumirMarcador(m) };
  }
  if (!m.superTieBreak)
    return {
      ok: false,
      error: "Quedaron un set iguales: falta el súper tie-break.",
    };
  const stb = validarDesempate(
    m.superTieBreak.a,
    m.superTieBreak.b,
    F.superTieBreakA,
    "Súper tie-break",
  );
  if (stb !== "a" && stb !== "b") return { ok: false, error: stb };
  return { ok: true, ganador: stb, resumen: resumirMarcador(m) };
}

/**
 * Valida el marcador guardado cuando se termina el turno sin terminar el
 * partido. Tiene que ser un marcador alcanzable y NO un partido terminado.
 */
export function validarMarcadorParcial(
  m: Marcador,
): { ok: true } | { ok: false; error: string } {
  if (!m || !Array.isArray(m.sets) || m.sets.length === 0 || m.sets.length > 2)
    return {
      ok: false,
      error: "Cargá entre uno y dos sets (el último puede estar en juego).",
    };
  if (validarMarcadorFinal(m).ok)
    return {
      ok: false,
      error:
        "Ese marcador es de un partido terminado: cargalo como resultado final.",
    };

  const terminados: Lado[] = [];
  for (let i = 0; i < m.sets.length; i++) {
    const s = m.sets[i]!;
    const esUltimo = i === m.sets.length - 1 && !m.superTieBreak;
    const g = validarSet(s, i + 1);
    if (g === "a" || g === "b") {
      terminados.push(g);
      continue;
    }
    if (!esUltimo) return { ok: false, error: g };
    // Set en juego: nadie lo ganó todavía.
    if (!esEntero(s.a) || !esEntero(s.b))
      return {
        ok: false,
        error: `Set ${i + 1}: los games deben ser números enteros.`,
      };
    const w = Math.max(s.a, s.b);
    const l = Math.min(s.a, s.b);
    const enJuego =
      w < F.gamesPorSet || (w === F.gamesPorSet && l >= F.gamesPorSet - 1);
    if (!enJuego) return { ok: false, error: g };
  }
  if (terminados.length === 2 && terminados[0] === terminados[1])
    return {
      ok: false,
      error:
        "Con dos sets ganados por la misma pareja el partido está terminado.",
    };
  if (m.superTieBreak) {
    if (terminados.length !== 2)
      return {
        ok: false,
        error:
          "El súper tie-break se juega sólo después de dos sets terminados 1–1.",
      };
    const { a, b } = m.superTieBreak;
    if (!esEntero(a) || !esEntero(b))
      return {
        ok: false,
        error: "Súper tie-break: los puntos deben ser números enteros.",
      };
    const terminado = validarDesempate(
      a,
      b,
      F.superTieBreakA,
      "Súper tie-break",
    );
    if (terminado === "a" || terminado === "b")
      return {
        ok: false,
        error:
          "Ese súper tie-break está terminado: cargalo como resultado final.",
      };
    const w = Math.max(a, b);
    const l = Math.min(a, b);
    if (w > F.superTieBreakA && w - l > 1)
      return { ok: false, error: "Súper tie-break: marcador imposible." };
  }
  return { ok: true };
}

export function resumirMarcador(m: Marcador): string {
  const sets = m.sets.map((s) =>
    s.tbA !== undefined && s.tbB !== undefined
      ? `${s.a}–${s.b} (${Math.min(s.tbA, s.tbB)})`
      : `${s.a}–${s.b}`,
  );
  if (m.superTieBreak) sets.push(`[${m.superTieBreak.a}–${m.superTieBreak.b}]`);
  return sets.join(", ");
}

/** Da vuelta el marcador para mostrarlo desde el punto de vista de la otra pareja. */
export function invertirMarcador(m: Marcador): Marcador {
  return {
    sets: m.sets.map((s) => ({ a: s.b, b: s.a, tbA: s.tbB, tbB: s.tbA })),
    superTieBreak: m.superTieBreak
      ? { a: m.superTieBreak.b, b: m.superTieBreak.a }
      : undefined,
  };
}

export function mismosMarcadores(x: Marcador, y: Marcador): boolean {
  return resumirMarcador(x) === resumirMarcador(y);
}
