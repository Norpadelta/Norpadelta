import clsx from "clsx";

export interface Persona {
  nombre: string;
  /** Sólo viene cuando quien mira es un usuario registrado. */
  foto?: string;
}

const TAMAÑOS = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-24 w-24 text-3xl",
};

/** Foto de perfil, o las iniciales en verde si no hay foto. */
export function Avatar({
  persona,
  tamaño = "sm",
  className,
}: {
  persona: Persona;
  tamaño?: keyof typeof TAMAÑOS;
  className?: string;
}) {
  const iniciales = persona.nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
  const base = clsx(
    "shrink-0 rounded-full ring-2 ring-fondo",
    TAMAÑOS[tamaño],
    className,
  );
  if (persona.foto) {
    // eslint-disable-next-line @next/next/no-img-element -- data URL chica, no pasa por el optimizador
    return (
      <img
        src={persona.foto}
        alt={persona.nombre}
        className={clsx(base, "object-cover")}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={clsx(
        base,
        "grid place-items-center bg-verde font-bold text-black",
      )}
    >
      {iniciales}
    </span>
  );
}

/** Los dos integrantes de una pareja, superpuestos. */
export function AvatarPareja({ integrantes }: { integrantes: Persona[] }) {
  return (
    <span className="flex -space-x-1.5">
      {integrantes.map((p) => (
        <Avatar key={p.nombre} persona={p} />
      ))}
    </span>
  );
}
