import {
  nuevoId,
  obtener,
  ReglaError,
  registrarAccion,
  notificar,
  type Estado,
} from "./estado";
import { exigirAdminDeBarrio } from "./permisos";
import type { Categoria, EstadoValidacion, Modalidad, Usuario } from "./types";
import { CATEGORIAS, MODALIDADES } from "./types";
import { validarFoto } from "./fotos";

export interface DatosRegistro {
  nombre: string;
  apellido: string;
  contacto: string;
  barrioId: string;
  categoria: Categoria;
  modalidades: Modalidad[];
  /** Foto de perfil opcional. */
  foto?: string;
}

/** Alta de un jugador. Queda pendiente de validación de residencia y categoría. */
export function registrarJugador(
  e: Estado,
  d: DatosRegistro,
  ahora: string,
): { usuarioId: string; jugadorId: string } {
  const nombre = d.nombre?.trim();
  const apellido = d.apellido?.trim();
  const contacto = d.contacto?.trim();
  if (!nombre || !apellido) throw new ReglaError("Completá nombre y apellido.");
  if (!contacto)
    throw new ReglaError("Dejanos un medio de contacto (teléfono o email).");
  obtener.barrio(e, d.barrioId);
  if (!CATEGORIAS.some((c) => c.id === d.categoria))
    throw new ReglaError("Elegí una categoría.");
  const modalidades = Array.from(new Set(d.modalidades)).filter((m) =>
    MODALIDADES.some((x) => x.id === m),
  );
  if (modalidades.length === 0)
    throw new ReglaError("Elegí al menos una modalidad.");

  const foto = d.foto?.trim() ? validarFoto(d.foto) : undefined;

  const usuarioId = nuevoId(e, "usr");
  const jugadorId = nuevoId(e, "jug");
  e.usuarios.push({
    id: usuarioId,
    nombre: `${nombre} ${apellido}`,
    roles: ["jugador"],
    jugadorId,
  });
  e.jugadores.push({
    id: jugadorId,
    usuarioId,
    nombre,
    apellido,
    contacto,
    barrioId: d.barrioId,
    categoria: d.categoria,
    modalidades,
    residencia: "pendiente",
    categoriaValidada: false,
    ...(foto ? { foto } : {}),
    creadoEn: ahora,
  });
  return { usuarioId, jugadorId };
}

export function validarJugador(
  e: Estado,
  actor: Usuario | null,
  jugadorId: string,
  v: { residencia: EstadoValidacion; categoria: Categoria; motivo?: string },
  ahora: string,
) {
  const j = obtener.jugador(e, jugadorId);
  exigirAdminDeBarrio(actor, j.barrioId);
  if (v.residencia === "rechazada" && !v.motivo?.trim())
    throw new ReglaError("Indicá el motivo del rechazo.");
  const antes = `${j.residencia}/${j.categoria}`;
  j.residencia = v.residencia;
  j.categoria = v.categoria;
  j.categoriaValidada = v.residencia === "validada";
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: "validar_jugador",
      entidad: "jugador",
      entidadId: j.id,
      motivo: v.motivo,
      detalle: `${antes} → ${j.residencia}/${j.categoria}`,
    },
    ahora,
  );
  notificar(
    e,
    j.usuarioId,
    v.residencia === "validada"
      ? "Tu perfil fue validado. ¡Ya podés formar pareja!"
      : "Revisamos tu perfil: la residencia no fue validada.",
    ahora,
    "/parejas",
  );
}
