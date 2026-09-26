"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface ItemNav {
  href: string;
  texto: string;
  icono: keyof typeof ICONOS;
}

// Íconos simples en línea (sin dependencias).
const ICONOS = {
  liga: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  partidos:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-6 5c3 1 5 4 5 8m7-8c-3 1-5 4-5 8",
  parejas:
    "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 3-5 6-5s6 2 6 5m-2-5c1-.6 2.4-1 4-1 3 0 6 2 6 5",
  barrios: "M3 21V9l6-4 6 4v12M15 21V12l6 3v6M7 13h4m-4 4h4",
  copas:
    "M7 4h10v4a5 5 0 0 1-10 0V4Zm0 2H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4m-5 3v4m-4 3h8",
  ranking: "M4 21h16M6 21v-6h4v6m4 0V9h4v12M8 5l4-2 4 2",
  mundial:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  reglamento: "M6 3h9l4 4v14H6V3Zm9 0v4h4M9 12h7m-7 4h7",
  admin: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Zm-3 9 2 2 4-4",
  mas: "M5 12h.01M12 12h.01M19 12h.01",
} as const;

function Icono({
  nombre,
  className,
}: {
  nombre: keyof typeof ICONOS;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={clsx("h-5 w-5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={nombre === "mas" ? 3 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONOS[nombre]} />
    </svg>
  );
}

function activo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Barra lateral en computadora: todas las secciones. */
export function NavLateral({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="sticky top-16 hidden w-56 shrink-0 self-start py-6 md:block"
    >
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={activo(pathname, i.href) ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                activo(pathname, i.href)
                  ? "bg-verde text-black"
                  : "text-suave hover:bg-superficie hover:text-white",
              )}
            >
              <Icono nombre={i.icono} />
              {i.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Barra inferior en celular: las cinco secciones de uso diario. */
export function NavInferior({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-fondo/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((i) => {
          const on = activo(pathname, i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={on ? "page" : undefined}
                className={clsx(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  on ? "text-verde" : "text-suave",
                )}
              >
                <Icono nombre={i.icono} />
                {i.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { Icono };
