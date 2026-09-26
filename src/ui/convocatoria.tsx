import { responderConvocatoria } from "@/app/acciones";
import { invitacionActual, siguienteElegible } from "@/domain/convocatorias";
import { nombreJugador, type Estado } from "@/domain/estado";
import { formatoFecha, tiempoRestante } from "@/domain/tiempo";
import type { Convocatoria, EstadoInvitacion } from "@/domain/types";
import { nombreLiga } from "@/data/vistas";
import { Aviso, Etiqueta, Pendiente, Volver } from "./kit";

const ESTADO_INV: Record<
  EstadoInvitacion,
  { texto: string; tono: "verde" | "alerta" | "neutro" | "contorno" }
> = {
  invitada: { texto: "Invitada", tono: "alerta" },
  aceptada: { texto: "Confirmada", tono: "verde" },
  rechazada: { texto: "No puede", tono: "neutro" },
  vencida: { texto: "No confirmó a tiempo", tono: "neutro" },
  omitida_incompleta: { texto: "Pareja incompleta", tono: "contorno" },
};

const ESTADO_CONV = {
  en_curso: { texto: "Convocatoria en curso", tono: "alerta" },
  cubierta: { texto: "Plaza cubierta", tono: "verde" },
  sin_representante: { texto: "Sin representante", tono: "neutro" },
  bloqueada_empate: { texto: "Bloqueada por empate", tono: "alerta" },
} as const;

/** Convocatoria transparente: corte congelado, orden de mérito, estados y siguiente elegible. */
export function VistaConvocatoria({
  e,
  c,
  ahora,
  jugadorId,
}: {
  e: Estado;
  c: Convocatoria;
  ahora: string;
  jugadorId?: string;
}) {
  const corte = e.cortes.find((x) => x.id === c.corteId)!;
  const actual = invitacionActual(c);
  const siguiente = siguienteElegible(e, c);
  const pareja = actual
    ? e.parejas.find((p) => p.id === actual.parejaId)
    : undefined;
  const soyInvitado =
    !!pareja &&
    !!jugadorId &&
    (pareja.jugadorAId === jugadorId || pareja.jugadorBId === jugadorId);

  return (
    <div className="tarjeta">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {c.simulada && <Etiqueta tono="alerta">Simulación</Etiqueta>}
        <Etiqueta tono={ESTADO_CONV[c.estado].tono}>
          {ESTADO_CONV[c.estado].texto}
        </Etiqueta>
      </div>
      <p className="font-semibold">{c.competencia.nombre}</p>
      <p className="mb-3 text-sm text-suave">
        {nombreLiga(e, c)} · corte del {formatoFecha(corte.creadoEn)} · base{" "}
        {corte.base === "anual" ? "anual" : "del período"} · plazo{" "}
        {c.plazoHoras} h
      </p>

      {soyInvitado && actual && (
        <Aviso titulo="¡Tu pareja está convocada!">
          <p>
            Confirmen los dos integrantes ·{" "}
            {tiempoRestante(actual.confirmarAntes, ahora)}. Ya confirmaron:{" "}
            {actual.confirmaciones.length
              ? actual.confirmaciones
                  .map((id) => nombreJugador(e, id))
                  .join(", ")
              : "nadie todavía"}
            .
          </p>
          <form action={responderConvocatoria} className="mt-2 flex gap-2">
            <Volver a="/copas" />
            <input type="hidden" name="convocatoriaId" value={c.id} />
            <button
              name="respuesta"
              value="si"
              className="btn-primario flex-1"
              disabled={actual.confirmaciones.includes(jugadorId!)}
            >
              Confirmá
            </button>
            <button
              name="respuesta"
              value="no"
              className="btn-secundario flex-1"
            >
              No podemos
            </button>
          </form>
        </Aviso>
      )}

      {c.estado === "bloqueada_empate" && (
        <Aviso
          tono="alerta"
          titulo="Hay un empate en el próximo lugar a convocar"
        >
          <p>
            Nadie elige a mano: la convocatoria sigue cuando el reglamento
            defina el criterio. <Pendiente>desempates</Pendiente>
          </p>
        </Aviso>
      )}

      <ol className="divide-y divide-borde overflow-hidden rounded-xl border border-borde">
        {corte.filas.map((f) => {
          const inv = c.invitaciones.find((i) => i.parejaId === f.parejaId);
          const esSiguiente =
            siguiente?.parejaId === f.parejaId && c.estado === "en_curso";
          return (
            <li
              key={f.parejaId}
              className="flex flex-wrap items-center justify-between gap-2 bg-superficie-2 px-3 py-2.5 text-sm"
            >
              <span className="flex items-center gap-3">
                <span className="w-6 font-bold tabular-nums">
                  {f.posicion}
                  {f.empatada && f.puntos > 0 ? "=" : ""}
                </span>
                <span>
                  <span className="font-medium">{f.nombrePareja}</span>
                  <span className="ml-2 text-xs text-tenue">
                    {f.puntos} pts
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                {inv && inv.estado === "invitada" && (
                  <span className="text-xs text-alerta">
                    {tiempoRestante(inv.confirmarAntes, ahora)}
                  </span>
                )}
                {inv ? (
                  <Etiqueta tono={ESTADO_INV[inv.estado].tono}>
                    {ESTADO_INV[inv.estado].texto}
                  </Etiqueta>
                ) : esSiguiente ? (
                  <Etiqueta tono="contorno">Siguiente si hace falta</Etiqueta>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
