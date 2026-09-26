import clsx from "clsx";

const PASOS = [
  "Registrate",
  "Validamos tu perfil",
  "Formá tu pareja",
  "Entrá a tu liga",
  "Desafiá y jugá",
];

/** Recorrido del jugador: registrarse → validar → pareja → liga → desafiar. */
export function Recorrido({ paso }: { paso: number }) {
  return (
    <ol className="mb-6 grid grid-cols-5 gap-1" aria-label="Tu recorrido">
      {PASOS.map((p, i) => (
        <li key={p} className="min-w-0">
          <div
            className={clsx(
              "mb-1.5 h-1 rounded-full",
              i < paso ? "bg-verde" : i === paso ? "bg-verde/40" : "bg-borde",
            )}
          />
          <p
            className={clsx(
              "truncate text-[11px]",
              i === paso
                ? "font-semibold text-white"
                : i < paso
                  ? "text-verde"
                  : "text-tenue",
            )}
          >
            {i < paso ? "✓ " : ""}
            {p}
          </p>
        </li>
      ))}
    </ol>
  );
}
