import Link from "next/link";
import { desafiar } from "@/app/acciones";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { NOMBRE_MODALIDAD, vistaLiga } from "@/data/vistas";
import { ligaDePareja } from "@/domain/ligas";
import { REGLAS_LIGA } from "@/domain/reglas";
import { formatoFecha } from "@/domain/tiempo";
import type { Modalidad } from "@/domain/types";
import {
  Aviso,
  Dato,
  Etiqueta,
  Pendiente,
  Seccion,
  Titulo,
  Vacio,
  Volver,
} from "@/ui/kit";
import { TablaRanking } from "@/ui/tabla-ranking";
import { Recorrido } from "@/ui/recorrido";

export const metadata = { title: "Mi liga" };

export default async function MiLiga({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const uid = await idUsuarioActual();
  const d = leer((e, ahora) => {
    const u = usuarioDe(e, uid);
    const j = u?.jugadorId
      ? e.jugadores.find((x) => x.id === u.jugadorId)
      : undefined;
    if (!u || !j) return { u, j: undefined } as const;
    const parejas = e.parejas.filter(
      (p) =>
        p.estado === "activa" &&
        (p.jugadorAId === j.id || p.jugadorBId === j.id),
    );
    const enCurso = e.parejas.some(
      (p) =>
        ["invitacion", "pendiente_aprobacion"].includes(p.estado) &&
        (p.jugadorAId === j.id || p.jugadorBId === j.id),
    );
    const pareja = parejas.find((p) => p.modalidad === m) ?? parejas[0];
    const liga = pareja ? ligaDePareja(e, pareja) : undefined;
    const temporada = e.temporadas.find((t) => t.id === e.temporadaActualId);
    return {
      u,
      j,
      enCurso,
      modalidades: parejas.map((p) => p.modalidad),
      pareja,
      vista:
        liga && pareja ? vistaLiga(e, liga, ahora, pareja, true) : undefined,
      proximoCorte: temporada?.proximoCorte ?? null,
    } as const;
  });

  if (!d.u) {
    return (
      <>
        <Titulo sobre="Tu barrio, tu liga">Mi liga</Titulo>
        <Vacio
          titulo="Ingresá para ver tu liga"
          accion={
            <div className="flex justify-center gap-2">
              <Link href="/registro" className="btn-primario">
                Registrate
              </Link>
              <Link href="/ingresar" className="btn-secundario">
                Ingresá
              </Link>
            </div>
          }
        >
          Cada jugador compite en la liga de su barrio, en su categoría y
          modalidad.
        </Vacio>
      </>
    );
  }
  if (!d.j) {
    return (
      <>
        <Titulo sobre="Administración">Mi liga</Titulo>
        <Vacio
          titulo="Tu usuario no tiene perfil de jugador"
          accion={
            <Link href="/barrios" className="btn-secundario">
              Ver ligas por barrio
            </Link>
          }
        >
          Las ligas de cada barrio se consultan desde Barrios.
        </Vacio>
      </>
    );
  }

  const paso =
    d.j.residencia !== "validada"
      ? 1
      : !d.pareja
        ? 2
        : !d.vista?.liga.habilitada
          ? 3
          : 4;

  return (
    <>
      <Titulo sobre="Tu barrio, tu liga">Mi liga</Titulo>

      {paso < 4 && <Recorrido paso={paso} />}

      {d.j.residencia === "pendiente" && (
        <Aviso titulo="Tu perfil está en revisión">
          <p>
            La administración valida tu residencia y tu categoría. Cuando esté
            listo te avisamos y vas a poder formar pareja.
          </p>
        </Aviso>
      )}
      {d.j.residencia === "rechazada" && (
        <Aviso tono="alerta" titulo="No pudimos validar tu residencia">
          <p>Escribile a la administración para revisarlo.</p>
        </Aviso>
      )}

      {d.j.residencia === "validada" && !d.pareja && (
        <Vacio
          titulo={
            d.enCurso ? "Tu pareja está en camino" : "Todavía no tenés pareja"
          }
          accion={
            <Link href="/parejas" className="btn-primario">
              {d.enCurso ? "Ver estado de tu pareja" : "Formá tu pareja"}
            </Link>
          }
        >
          {d.enCurso
            ? "Falta que tu compañero/a confirme o que la administración apruebe la pareja."
            : "En Norpadelta se compite en parejas: invitá a tu compañero/a de tu mismo barrio."}
        </Vacio>
      )}

      {d.vista && d.pareja && (
        <>
          {d.modalidades.length > 1 && (
            <div
              className="mb-4 flex gap-2"
              role="tablist"
              aria-label="Modalidad"
            >
              {d.modalidades.map((mod) => (
                <Link
                  key={mod}
                  href={`/mi-liga?m=${mod}`}
                  role="tab"
                  aria-selected={mod === d.pareja!.modalidad}
                  className={
                    mod === d.pareja!.modalidad
                      ? "btn-primario min-h-9 px-3"
                      : "btn-secundario min-h-9 px-3"
                  }
                >
                  {NOMBRE_MODALIDAD[mod as Modalidad]}
                </Link>
              ))}
            </div>
          )}

          <div className="tarjeta mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">{d.vista.nombre}</h2>
              {d.vista.liga.habilitada ? (
                <Etiqueta tono="verde">En juego</Etiqueta>
              ) : (
                <Etiqueta tono="contorno">En formación</Etiqueta>
              )}
            </div>
            {d.vista.liga.habilitada && d.vista.cupos && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Dato
                  etiqueta="Puntuables del mes"
                  valor={`${d.vista.cupos.puntuablesDelMes}/${REGLAS_LIGA.maxPartidosPuntuablesPorMes}`}
                  destacado={
                    d.vista.cupos.puntuablesDelMes <
                    REGLAS_LIGA.maxPartidosPuntuablesPorMes
                  }
                />
                <Dato
                  etiqueta="Desafíos pendientes"
                  valor={`${d.vista.cupos.abiertos}/${REGLAS_LIGA.maxDesafiosAbiertosPorPareja}`}
                />
                <div className="col-span-2 rounded-xl bg-superficie-2 px-3 py-2 sm:col-span-1">
                  <p className="text-[11px] tracking-wide text-tenue uppercase">
                    Próximo corte
                  </p>
                  {d.proximoCorte ? (
                    <p className="text-lg font-bold">
                      {formatoFecha(d.proximoCorte)}
                    </p>
                  ) : (
                    <p className="pt-1 text-sm text-suave">
                      Sin fecha definida
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {!d.vista.liga.habilitada ? (
            <Seccion titulo={`Parejas anotadas (${d.vista.activas})`}>
              <Aviso
                tono="pendiente"
                titulo="Esta liga todavía no está en juego"
              >
                <p>
                  Se habilita cuando haya suficientes parejas.{" "}
                  <Pendiente>mínimo de parejas por liga</Pendiente>
                </p>
                <p>
                  Mientras tanto podés invitar a vecinos a sumarse o jugar
                  amistosos (no suman puntos).
                </p>
              </Aviso>
              <ul className="divide-y divide-borde rounded-2xl border border-borde">
                {d.vista.filas.map((f) => (
                  <li
                    key={f.parejaId}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span
                      className={f.propia ? "font-semibold text-verde" : ""}
                    >
                      {f.nombre}
                    </span>
                    {f.propia && <Etiqueta tono="verde">Tu pareja</Etiqueta>}
                  </li>
                ))}
              </ul>
            </Seccion>
          ) : (
            <Seccion
              titulo="Posiciones"
              extra={
                <Link
                  href="/reglamento#liga"
                  className="text-xs text-suave underline"
                >
                  Cómo se suma
                </Link>
              }
            >
              {(() => {
                const propios = Array.from(
                  new Set(
                    d.vista.filas.flatMap((f) =>
                      f.motivos.filter((m) => m.startsWith("Tu pareja")),
                    ),
                  ),
                );
                return propios.length > 0 ? (
                  <Aviso
                    tono="alerta"
                    titulo="Por ahora no podés enviar desafíos"
                  >
                    {propios.map((m) => (
                      <p key={m}>{m}</p>
                    ))}
                  </Aviso>
                ) : null;
              })()}
              {d.vista.filas.length < 2 && (
                <Vacio titulo="Todavía no hay rivales en tu liga">
                  Invitá a otras parejas de tu barrio a sumarse.
                </Vacio>
              )}
              <TablaRanking
                filas={d.vista.filas}
                accion={(f) =>
                  f.propia ? null : f.motivos.length === 0 ? (
                    <form action={desafiar}>
                      <Volver a="/mi-liga" />
                      <input
                        type="hidden"
                        name="retadoraId"
                        value={d.pareja!.id}
                      />
                      <input type="hidden" name="retadaId" value={f.parejaId} />
                      <button className="btn-primario min-h-8 rounded-lg px-3 text-xs">
                        Desafiá
                      </button>
                    </form>
                  ) : f.motivos.some((m) => !m.startsWith("Tu pareja")) ? (
                    <p className="max-w-56 text-[11px] leading-snug text-tenue">
                      {f.motivos.find((m) => !m.startsWith("Tu pareja"))}
                    </p>
                  ) : null
                }
              />
              {d.vista.hayEmpates && (
                <p className="mt-3 text-xs text-suave">
                  = Parejas empatadas en puntos: comparten la posición.{" "}
                  <Pendiente>criterio de desempate</Pendiente>
                </p>
              )}
            </Seccion>
          )}
        </>
      )}
    </>
  );
}
