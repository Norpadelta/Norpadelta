import clsx from "clsx";
import type { ReactNode } from "react";
import { Etiqueta } from "./kit";

export interface FilaVista {
  parejaId: string;
  posicion: number;
  empatada: boolean;
  puntos: number;
  jugados: number;
  ganados: number;
  nombre: string;
  estado?: string;
  propia?: boolean;
}

/** Tabla de posiciones pensada para leer en el celular: pocas columnas y números grandes. */
export function TablaRanking<F extends FilaVista>({
  filas,
  accion,
}: {
  filas: F[];
  accion?: (f: F) => ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-borde">
      <table className="w-full text-sm">
        <thead className="bg-superficie-2 text-[11px] tracking-wide text-tenue uppercase">
          <tr>
            <th scope="col" className="w-12 py-2 pl-4 text-left font-medium">
              #
            </th>
            <th scope="col" className="py-2 text-left font-medium">
              Pareja
            </th>
            <th
              scope="col"
              className="w-10 py-2 text-center font-medium"
              title="Partidos jugados"
            >
              PJ
            </th>
            <th
              scope="col"
              className="w-10 py-2 text-center font-medium"
              title="Partidos ganados"
            >
              PG
            </th>
            <th scope="col" className="w-14 py-2 pr-4 text-right font-medium">
              Pts
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borde">
          {filas.map((f) => {
            const extra = accion?.(f);
            return (
              <tr
                key={f.parejaId}
                className={clsx(f.propia ? "bg-verde-fondo" : "bg-superficie")}
              >
                <td className="py-3 pl-4 align-top font-bold tabular-nums">
                  <span
                    className={clsx(
                      f.posicion === 1 && f.puntos > 0 && "text-verde",
                    )}
                  >
                    {f.posicion}
                  </span>
                  {f.empatada && f.puntos > 0 && (
                    <span className="text-tenue">=</span>
                  )}
                </td>
                <td className="py-3 pr-2 align-top">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={clsx("font-medium", f.propia && "text-verde")}
                    >
                      {f.nombre}
                    </span>
                    {f.propia && <Etiqueta tono="verde">Tu pareja</Etiqueta>}
                    {f.estado === "disuelta" && <Etiqueta>Disuelta</Etiqueta>}
                  </div>
                  {extra && <div className="mt-2">{extra}</div>}
                </td>
                <td className="py-3 text-center align-top text-suave tabular-nums">
                  {f.jugados}
                </td>
                <td className="py-3 text-center align-top text-suave tabular-nums">
                  {f.ganados}
                </td>
                <td className="py-3 pr-4 text-right align-top text-base font-bold tabular-nums">
                  {f.puntos}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
