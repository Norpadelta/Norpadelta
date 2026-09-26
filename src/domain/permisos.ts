import { ReglaError, type Estado } from "./estado";
import type { Jugador, Pareja, Usuario } from "./types";

// Las autorizaciones se verifican acá, dentro de cada servicio del dominio,
// que es lo que ejecuta el servidor. Ocultar botones en la UI es sólo comodidad.

export function esAdminGeneral(u: Usuario | null | undefined): boolean {
  return !!u?.roles.includes("admin_general");
}

/** Admin general o delegado de ESE barrio (rol futuro). */
export function puedeAdministrarBarrio(
  u: Usuario | null | undefined,
  barrioId: string,
): boolean {
  if (!u) return false;
  if (esAdminGeneral(u)) return true;
  return u.roles.includes("delegado") && u.barrioDelegadoId === barrioId;
}

export function exigirAdminGeneral(u: Usuario | null | undefined): Usuario {
  if (!u || !esAdminGeneral(u))
    throw new ReglaError(
      "Esta acción es sólo para la administración de Norpadelta.",
    );
  return u;
}

export function exigirAdminDeBarrio(
  u: Usuario | null | undefined,
  barrioId: string,
): Usuario {
  if (!u || !puedeAdministrarBarrio(u, barrioId))
    throw new ReglaError("No tenés permisos sobre este barrio.");
  return u;
}

export function jugadorDe(e: Estado, u: Usuario | null | undefined): Jugador {
  const j = u?.jugadorId
    ? e.jugadores.find((x) => x.id === u.jugadorId)
    : undefined;
  if (!j)
    throw new ReglaError("Necesitás un perfil de jugador para hacer esto.");
  return j;
}

export function esIntegrante(p: Pareja, jugadorId: string): boolean {
  return p.jugadorAId === jugadorId || p.jugadorBId === jugadorId;
}

/** Exige que el usuario integre la pareja. */
export function exigirIntegrante(
  e: Estado,
  u: Usuario | null | undefined,
  p: Pareja,
): Jugador {
  const j = jugadorDe(e, u);
  if (!esIntegrante(p, j.id))
    throw new ReglaError(
      "Sólo los integrantes de la pareja pueden hacer esto.",
    );
  return j;
}
