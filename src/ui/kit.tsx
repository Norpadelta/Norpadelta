import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

type Tono = "verde" | "neutro" | "alerta" | "error" | "contorno";

export function Etiqueta({
  tono = "neutro",
  children,
  className,
}: {
  tono?: Tono;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase",
        tono === "verde" && "bg-verde text-black",
        tono === "neutro" && "bg-superficie-2 text-suave",
        tono === "alerta" && "bg-alerta/15 text-alerta",
        tono === "error" && "bg-error/15 text-error",
        tono === "contorno" && "border border-borde text-suave",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Titulo({
  sobre,
  children,
  accion,
}: {
  sobre?: ReactNode;
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        {sobre && (
          <p className="mb-1 text-xs font-semibold tracking-widest text-verde uppercase">
            {sobre}
          </p>
        )}
        <h1 className="text-2xl leading-tight font-bold md:text-3xl">
          {children}
        </h1>
      </div>
      {accion}
    </div>
  );
}

export function Seccion({
  titulo,
  extra,
  children,
  className,
}: {
  titulo: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("mb-8", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-suave uppercase">
          {titulo}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function Vacio({
  titulo,
  children,
  accion,
}: {
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-borde px-4 py-8 text-center">
      <p className="font-semibold">{titulo}</p>
      {children && (
        <div className="mx-auto mt-1 max-w-md text-sm text-suave">
          {children}
        </div>
      )}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Aviso({
  tono = "info",
  titulo,
  children,
}: {
  tono?: "info" | "alerta" | "pendiente";
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "mb-4 rounded-2xl border p-4 text-sm",
        tono === "info" && "border-verde/30 bg-verde-fondo text-white",
        tono === "alerta" && "border-alerta/30 bg-alerta/5 text-white",
        tono === "pendiente" && "border-borde bg-superficie-2 text-suave",
      )}
    >
      {titulo && (
        <p
          className={clsx(
            "mb-1 font-semibold",
            tono === "alerta"
              ? "text-alerta"
              : tono === "info"
                ? "text-verde"
                : "text-white",
          )}
        >
          {titulo}
        </p>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

/** Marca explícita de reglas que todavía no están aprobadas. */
export function Pendiente({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-tenue px-1.5 py-0.5 text-xs text-suave">
      Pendiente · {children}
    </span>
  );
}

export function EnlaceTarjeta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "tarjeta block transition-colors hover:border-tenue",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Dato({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: ReactNode;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-xl bg-superficie-2 px-3 py-2">
      <p className="text-[11px] tracking-wide text-tenue uppercase">
        {etiqueta}
      </p>
      <p
        className={clsx(
          "text-lg font-bold tabular-nums",
          destacado && "text-verde",
        )}
      >
        {valor}
      </p>
    </div>
  );
}

/** Campo oculto con la ruta a la que vuelve la acción. */
export function Volver({ a }: { a: string }) {
  return <input type="hidden" name="volver" value={a} />;
}
