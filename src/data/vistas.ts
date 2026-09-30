import { nombrePareja, type Estado } from "@/domain/estado";
import { cuposDePareja, motivosNoElegible } from "@/domain/desafios";
import { ligaDePareja, parejasActivasDeLiga } from "@/domain/ligas";
import { calcularRanking } from "@/domain/ranking";
import {
  CATEGORIAS,
  MODALIDADES,
  type Categoria,
  type Liga,
  type Modalidad,
  type Pareja,
} from "@/domain/types";

export const NOMBRE_CATEGORIA = Object.fromEntries(
  CATEGORIAS.map((c) => [c.id, c.nombre]),
) as Record<Categoria, string>;
export const NOMBRE_MODALIDAD = Object.fromEntries(
  MODALIDADES.map((m) => [m.id, m.nombre]),
) as Record<Modalidad, string>;

export function nombreLiga(
  e: Estado,
  l: Pick<Liga, "barrioId" | "categoria" | "modalidad">,
) {
  const barrio = e.barrios.find((b) => b.id === l.barrioId)?.nombre ?? "—";
  return `${barrio} · ${NOMBRE_CATEGORIA[l.categoria]} · ${NOMBRE_MODALIDAD[l.modalidad]}`;
}

/** Integrantes de una pareja con su foto, sólo si quien mira está registrado. */
export function integrantes(
  e: Estado,
  p: Pick<Pareja, "jugadorAId" | "jugadorBId">,
  conFotos: boolean,
) {
  return [p.jugadorAId, p.jugadorBId].map((id) => {
    const j = e.jugadores.find((x) => x.id === id);
    return {
      nombre: j ? `${j.nombre} ${j.apellido}` : "—",
      foto: conFotos ? j?.foto : undefined,
    };
  });
}

export function nombreDe(e: Estado, parejaId: string) {
  const p = e.parejas.find((x) => x.id === parejaId);
  return p ? nombrePareja(e, p) : "—";
}

/** Ranking con nombres y, si hay pareja propia, elegibilidad para desafiar a cada rival. */
export function vistaLiga(
  e: Estado,
  liga: Liga,
  ahora: string,
  propia?: Pareja,
  conFotos = false,
) {
  const filas = calcularRanking(e, liga.id).map((f) => {
    const p = e.parejas.find((x) => x.id === f.parejaId)!;
    const motivos =
      propia && propia.id !== p.id && liga.habilitada
        ? motivosNoElegible(e, propia, p, ahora)
        : [];
    return {
      ...f,
      nombre: nombrePareja(e, p),
      integrantes: integrantes(e, p, conFotos),
      estado: p.estado,
      propia: propia?.id === p.id,
      motivos,
    };
  });
  return {
    liga,
    nombre: nombreLiga(e, liga),
    filas,
    hayEmpates: filas.some((f) => f.empatada && f.puntos > 0),
    activas: parejasActivasDeLiga(e, liga).length,
    cupos: propia ? cuposDePareja(e, propia.id, ahora) : null,
  };
}

export function ligaPropia(e: Estado, p: Pareja) {
  return ligaDePareja(e, p);
}
