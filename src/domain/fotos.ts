import {
  notificar,
  obtener,
  ReglaError,
  registrarAccion,
  type Estado,
} from "./estado";
import { puedeAdministrarBarrio } from "./permisos";
import type { Usuario } from "./types";

// Foto de perfil opcional. El navegador la recorta y achica antes de subirla;
// el servidor igual valida formato y tamaño. En la demo se guarda como data
// URL; en producción, en un almacenamiento de archivos (p. ej. Vercel Blob).

export const FOTO_MAX_CARACTERES = 200_000; // ~150 KB de imagen
const FORMATO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

export function validarFoto(foto: string): string {
  const f = foto.trim();
  if (!FORMATO.test(f))
    throw new ReglaError("La foto tiene que ser una imagen JPG, PNG o WebP.");
  if (f.length > FOTO_MAX_CARACTERES)
    throw new ReglaError("La foto es muy pesada. Probá con otra.");
  return f;
}

/** El propio jugador sube o cambia su foto. */
export function cambiarFoto(e: Estado, actor: Usuario | null, foto: string) {
  const j = actor?.jugadorId
    ? e.jugadores.find((x) => x.id === actor.jugadorId)
    : undefined;
  if (!j)
    throw new ReglaError("Necesitás un perfil de jugador para subir una foto.");
  j.foto = validarFoto(foto);
}

/**
 * Quitar la foto: el propio jugador, o la administración (por ejemplo, si es
 * inapropiada). Si la quita la administración, queda registrado y se avisa.
 */
export function quitarFoto(
  e: Estado,
  actor: Usuario | null,
  jugadorId: string,
  motivo: string,
  ahora: string,
) {
  const j = obtener.jugador(e, jugadorId);
  const esPropia = actor?.jugadorId === j.id;
  if (!esPropia && !puedeAdministrarBarrio(actor, j.barrioId))
    throw new ReglaError("No podés quitar la foto de otro jugador.");
  if (!j.foto) throw new ReglaError("Ese jugador no tiene foto.");
  if (!esPropia && !motivo.trim())
    throw new ReglaError("Indicá por qué se quita la foto.");
  j.foto = undefined;
  if (!esPropia) {
    registrarAccion(
      e,
      {
        usuarioId: actor!.id,
        accion: "quitar_foto",
        entidad: "jugador",
        entidadId: j.id,
        motivo,
      },
      ahora,
    );
    notificar(
      e,
      j.usuarioId,
      "La administración quitó tu foto de perfil. Podés subir otra.",
      ahora,
      "/perfil",
    );
  }
}
