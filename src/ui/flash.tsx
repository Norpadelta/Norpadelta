"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Muestra el resultado de la última acción (?ok= / ?error=) y limpia la URL. */
export function Flash() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [msg, setMsg] = useState<{
    ok?: string;
    error?: string;
    ruta: string;
    id: number;
  } | null>(null);

  useEffect(() => {
    const ok = params.get("ok") ?? undefined;
    const error = params.get("error") ?? undefined;
    if (!ok && !error) return;
    setMsg({ ok, error, ruta: pathname, id: Date.now() });
    const resto = new URLSearchParams(params);
    resto.delete("ok");
    resto.delete("error");
    router.replace(resto.size ? `${pathname}?${resto}` : pathname, {
      scroll: false,
    });
  }, [params, pathname, router]);

  // Un mensaje sólo se muestra en la pantalla donde se hizo la acción.
  if (!msg || msg.ruta !== pathname) return null;
  return (
    <div
      role={msg.error ? "alert" : "status"}
      data-flash={msg.id}
      className={
        msg.error
          ? "mb-4 flex items-start justify-between gap-3 rounded-2xl border border-error/40 bg-error/10 p-4 text-sm"
          : "mb-4 flex items-start justify-between gap-3 rounded-2xl border border-verde/40 bg-verde-fondo p-4 text-sm"
      }
    >
      <p>
        <span
          className={
            msg.error ? "font-semibold text-error" : "font-semibold text-verde"
          }
        >
          {msg.error ? "No se pudo. " : "Listo. "}
        </span>
        {msg.error ?? msg.ok}
      </p>
      <button
        type="button"
        onClick={() => setMsg(null)}
        className="text-suave hover:text-white"
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
