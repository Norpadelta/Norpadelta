import { Aviso, Pendiente, Seccion, Titulo, Vacio } from "@/ui/kit";

export const metadata = { title: "Ranking de barrios" };

const PRINCIPIOS = [
  "Suman sólo las parejas representantes, por sus resultados en las copas.",
  "Los puntos de las ligas locales no se suman al ranking de barrios: eso favorecería a los barrios con más parejas o más partidos.",
  "Igual cantidad de plazas por barrio en cada categoría y modalidad.",
  "Igual valor deportivo para categorías y modalidades equivalentes.",
  "Trazabilidad: cada punto muestra qué pareja y qué resultado lo aportó.",
];

export default function RankingBarrios() {
  return (
    <>
      <Titulo sobre="Se alimenta de las copas">Ranking de barrios</Titulo>
      <Vacio titulo="Todavía no se jugó ninguna copa">
        El ranking de barrios empieza a sumar con la primera copa entre barrios.
      </Vacio>

      <Seccion titulo="Principios aprobados" className="mt-8">
        <ul className="space-y-2">
          {PRINCIPIOS.map((p) => (
            <li key={p} className="tarjeta flex gap-3 text-sm">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-verde" />
              {p}
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Cómo se va a ver">
        <div className="overflow-hidden rounded-2xl border border-borde">
          <table className="w-full text-sm">
            <thead className="bg-superficie-2 text-[11px] tracking-wide text-tenue uppercase">
              <tr>
                <th className="py-2 pl-4 text-left font-medium">Barrio</th>
                <th className="py-2 text-left font-medium">
                  Aporte (pareja · copa · resultado)
                </th>
                <th className="py-2 pr-4 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-superficie">
                <td colSpan={3} className="px-4 py-6 text-center text-suave">
                  Sin resultados de copas todavía
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-tenue">
          Habrá clasificación por categoría y modalidad, además de la general
          cuando corresponda.
        </p>
      </Seccion>

      <Aviso tono="pendiente" titulo="Pendiente de definición">
        <p>
          <Pendiente>fórmula de puntos de copa</Pendiente>
        </p>
        <p>
          <Pendiente>
            clasificación general con distinta cobertura de categorías
          </Pendiente>{" "}
          Las alternativas propuestas están en el documento de decisiones
          pendientes; ninguna está implementada.
        </p>
      </Aviso>
    </>
  );
}
