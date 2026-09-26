import Link from "next/link";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { Etiqueta } from "@/ui/kit";
import { Isotipo } from "@/ui/marca";

const CIRCUITO = [
  {
    n: "01",
    titulo: "Liga de tu barrio",
    texto:
      "Desafiá a parejas de tu barrio, categoría y modalidad. Jugá seguido y conocé a tus vecinos.",
    estado: "Etapa 1 · piloto en Castaños",
    activo: true,
  },
  {
    n: "02",
    titulo: "Copas entre barrios",
    texto:
      "Las mejores parejas de cada liga representan a su barrio, convocadas por orden del ranking.",
    estado: "Etapa 2 · sin fecha",
  },
  {
    n: "03",
    titulo: "Mundial Norpadelta",
    texto:
      "El cierre anual: los barrios con mejor rendimiento en las copas se enfrentan por el título.",
    estado: "Etapa 3 · sin fecha",
  },
];

const PASOS = [
  "Registrate",
  "Validamos tu perfil",
  "Formá tu pareja",
  "Desafiá",
  "Coordiná el turno",
  "Jugá",
  "Cargá y validá",
  "Subí en el ranking",
];

export default async function Inicio() {
  const uid = await idUsuarioActual();
  const logueado = leer((e) => !!usuarioDe(e, uid));
  return (
    <>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-borde bg-superficie px-5 py-10 md:px-10 md:py-14">
        <Isotipo className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 opacity-10 md:h-80 md:w-80" />
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-verde uppercase">
          Pádel en los barrios de Nordelta
        </p>
        <h1 className="max-w-xl text-4xl leading-[1.05] font-black md:text-5xl">
          Jugá en tu barrio.
          <br />
          <span className="text-verde">Representalo</span> en las copas.
        </h1>
        <p className="mt-4 max-w-lg text-suave">
          Ligas por barrio, categoría y modalidad. Las mejores parejas llegan a
          las copas entre barrios y al Mundial Norpadelta, siempre por mérito
          deportivo.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {logueado ? (
            <Link href="/mi-liga" className="btn-primario">
              Entrá a tu liga
            </Link>
          ) : (
            <>
              <Link href="/registro" className="btn-primario">
                Registrate
              </Link>
              <Link href="/ingresar" className="btn-secundario">
                Probá la demo
              </Link>
            </>
          )}
          <Link href="/reglamento" className="btn-secundario">
            Reglamento
          </Link>
        </div>
      </section>

      <h2 className="mb-3 text-sm font-semibold tracking-wide text-suave uppercase">
        El circuito
      </h2>
      <ol className="mb-10 grid gap-3 md:grid-cols-3">
        {CIRCUITO.map((c) => (
          <li
            key={c.n}
            className={c.activo ? "tarjeta border-verde/50" : "tarjeta"}
          >
            <p
              className={
                c.activo
                  ? "text-3xl font-black text-verde"
                  : "text-3xl font-black text-tenue"
              }
            >
              {c.n}
            </p>
            <p className="mt-2 text-lg font-bold">{c.titulo}</p>
            <p className="mt-1 mb-3 text-sm text-suave">{c.texto}</p>
            <Etiqueta tono={c.activo ? "verde" : "contorno"}>
              {c.estado}
            </Etiqueta>
          </li>
        ))}
      </ol>

      <h2 className="mb-3 text-sm font-semibold tracking-wide text-suave uppercase">
        Cómo se juega
      </h2>
      <ol className="mb-10 flex flex-wrap gap-2">
        {PASOS.map((p, i) => (
          <li
            key={p}
            className="flex items-center gap-2 rounded-full border border-borde bg-superficie py-1.5 pr-3 pl-1.5 text-sm"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-verde text-xs font-bold text-black">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="tarjeta">
          <p className="font-semibold">Justo y transparente</p>
          <p className="text-sm text-suave">
            A las copas va la pareja mejor ubicada en el ranking congelado al
            corte. Si no puede, se invita a la siguiente. Nadie elige a dedo.
          </p>
        </div>
        <div className="tarjeta">
          <p className="font-semibold">Fácil de organizar</p>
          <p className="text-sm text-suave">
            Desafiá, acordá el turno con la reserva de tu barrio y cargá el
            resultado. El rival lo valida y el ranking se actualiza.
          </p>
        </div>
      </div>
    </>
  );
}
