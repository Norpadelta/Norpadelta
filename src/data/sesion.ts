import "server-only";
import { cookies } from "next/headers";
import type { Estado } from "@/domain/estado";
import type { Usuario } from "@/domain/types";

// ACCESO SIMULADO de la demo: se elige un usuario ficticio y se guarda su id
// en una cookie. La versión real usa autenticación (ver docs/arquitectura.md).
// Aun así, cada acción verifica permisos en el servidor con ese usuario.

export const COOKIE_USUARIO = "np_usuario";

export async function idUsuarioActual(): Promise<string | null> {
  return (await cookies()).get(COOKIE_USUARIO)?.value ?? null;
}

export function usuarioDe(e: Estado, id: string | null): Usuario | null {
  return (id && e.usuarios.find((u) => u.id === id)) || null;
}
