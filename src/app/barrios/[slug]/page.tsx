import Link from "next/link";
import { notFound } from "next/navigation";
import { invitarAmistoso } from "@/app/acciones";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { NOMBRE_CATEGORIA, NOMBRE_MODALIDAD, vistaLiga } from "@/data/vistas";
import { nombrePareja } from "@/domain/estado";
import { CATEGORIAS, MODALIDADES, type InfoSede } from "@/domain/types";
import { Aviso, Etiqueta, Pendiente, Seccion, Titulo, Volver } from "@/ui/kit";
import { TablaRanking } from "@/ui/tabla-ranking";

const CAMPOS_SEDE: [keyof InfoSede, string][] = [
  ["sistemaReservas", "Sistema de reservas"],
  ["canchas", "Canchas"],
  ["duracionTurnoMin", "Duración del turno"],
  ["costos", "Costos"],
  ["condicionesUso", "Condiciones de uso"],
  ["accesoVisitantes", "Acceso de visitantes"],
];

export default async function Barrio({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const uid = await idUsuarioActual();
  const d = leer((e, ahora) => {
    const b = e.barrios.find((x) => x.slug === slug);
    if (!b) return null;
    const u = usuarioDe(e, uid);
    const j = u?.jugadorId
      ? e.jugadores.find((x) => x.id === u.jugadorId)
      : undefined;
    const misParejas = j
      ? e.parejas.filter(
          (p) =>
            p.estado === "activa" &&
            (p.jugadorAId === j.id || p.jugadorBId === j.id),
        )
      : [];
    const ligas = CATEGORIAS.flatMap((c) =>
      MODALIDADES.map((m) =>
        e.ligas.find(
          (l) =>
            l.temporadaId === e.temporadaActualId &&
            l.barrioId === b.id &&
            l.categoria === c.id &&
            l.modalidad === m.id,
        ),
      ),
    )
      .filter((l) => !!l)
      .map((l) => vistaLiga(e, l!, ahora));
    const parejas = e.parejas
      .filter((p) => p.barrioId === b.id && p.estado === "activa")
      .map((p) => ({
        p,
        nombre: nombrePareja(e, p),
        mia: misParejas.find((x) => x.modalidad === p.modalidad),
      }));
    return { b, ligas, parejas, esOtroBarrio: !!j && j.barrioId !== b.id };
  });
  if (!d) notFound();
  const { b } = d;

  return (
    <>
      <Titulo
        sobre={
          <span className="inline-flex gap-2">
            {b.estado === "piloto"
              ? "Barrio piloto"
              : b.estado === "activo"
                ? "Barrio adherido"
                : "Sin confirmar"}
            {b.ficticio && <Etiqueta tono="alerta">Ficticio · demo</Etiqueta>}
          </span>
        }
      >
        {b.nombre}
      </Titulo>

      <Seccion titulo="Canchas y reservas">
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CAMPOS_SEDE.map(([k, etiqueta]) => {
            const v = b.sede[k];
            return (
              <div
                key={k}
                className="rounded-xl border border-borde bg-superficie px-3 py-2"
              >
                <dt className="text-[11px] tracking-wide text-tenue uppercase">
                  {etiqueta}
                </dt>
                <dd
                  className={
                    v === undefined ? "text-sm text-tenue" : "font-medium"
                  }
                >
                  {v === undefined
                    ? "Sin informar"
                    : k === "duracionTurnoMin"
                      ? `${v} minutos`
                      : String(v)}
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="mt-2 text-xs text-tenue">
          Norpadelta registra los turnos acordados; no reserva canchas ni está
          integrado con los sistemas de cada barrio.
        </p>
      </Seccion>

      <Seccion titulo="Ligas del barrio">
        {d.ligas.length === 0 ? (
          <p className="text-sm text-suave">
            Todavía no hay parejas aprobadas en este barrio.
          </p>
        ) : (
          <div className="space-y-3">
            {d.ligas.map((v) => (
              <details
                key={v.liga.id}
                className="tarjeta group"
                open={v.liga.habilitada}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {NOMBRE_CATEGORIA[v.liga.categoria]} ·{" "}
                    {NOMBRE_MODALIDAD[v.liga.modalidad]}
                  </span>
                  {v.liga.habilitada ? (
                    <Etiqueta tono="verde">En juego</Etiqueta>
                  ) : (
                    <Etiqueta tono="contorno">
                      En formación · {v.activas} parejas
                    </Etiqueta>
                  )}
                </summary>
                <div className="mt-3">
                  {v.liga.habilitada ? (
                    <TablaRanking filas={v.filas} />
                  ) : (
                    <p className="text-sm text-suave">
                      Se habilita cuando haya suficientes parejas.{" "}
                      <Pendiente>mínimo de parejas</Pendiente>
                    </p>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </Seccion>

      {d.esOtroBarrio && (
        <Seccion titulo="Amistosos con este barrio">
          <Aviso tono="pendiente">
            <p>
              Los amistosos entre barrios no suman puntos de liga, de copa ni
              del ranking de barrios. Los partidos oficiales entre barrios son
              los de las copas y el Mundial.
            </p>
          </Aviso>
          <ul className="divide-y divide-borde rounded-2xl border border-borde bg-superficie">
            {d.parejas.map(({ p, nombre, mia }) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{nombre}</span>{" "}
                  <span className="text-xs text-tenue">
                    {NOMBRE_MODALIDAD[p.modalidad]} ·{" "}
                    {NOMBRE_CATEGORIA[p.categoria]}
                  </span>
                </span>
                {mia ? (
                  <form action={invitarAmistoso}>
                    <Volver a={`/barrios/${b.slug}`} />
                    <input type="hidden" name="retadoraId" value={mia.id} />
                    <input type="hidden" name="retadaId" value={p.id} />
                    <button className="btn-secundario min-h-8 rounded-lg px-3 text-xs">
                      Proponé amistoso
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-tenue">
                    Sin pareja tuya en{" "}
                    {NOMBRE_MODALIDAD[p.modalidad].toLowerCase()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Seccion>
      )}
      <Link href="/barrios" className="text-sm text-suave underline">
        ← Todos los barrios
      </Link>
    </>
  );
}
