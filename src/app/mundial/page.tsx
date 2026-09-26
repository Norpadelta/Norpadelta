import { Aviso, Pendiente, Seccion, Titulo, Vacio } from "@/ui/kit";

export const metadata = { title: "Mundial" };

const CRITERIOS = [
  "Es el cierre anual del circuito Norpadelta. “Mundial” es el nombre del evento: participan barrios, no países.",
  "Los barrios clasifican según su rendimiento acumulado en las copas.",
  "Las parejas que representan a cada barrio se eligen por su ranking local en el corte correspondiente al Mundial.",
  "Se usa el mismo mecanismo de invitación y reemplazo por orden de mérito que en las copas.",
  "Haber jugado una copa no da la plaza automáticamente para el Mundial.",
  "El Mundial tiene sus propios resultados y su propia clasificación.",
];

export default function Mundial() {
  return (
    <>
      <Titulo sobre="Etapa 3 · cierre anual">Mundial Norpadelta</Titulo>
      <Vacio titulo="El Mundial todavía no está habilitado">
        Se habilita cuando se hayan jugado las copas del circuito anual.
      </Vacio>
      <Seccion titulo="Criterios aprobados" className="mt-8">
        <ul className="space-y-2">
          {CRITERIOS.map((c) => (
            <li key={c} className="tarjeta flex gap-3 text-sm">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-verde" />
              {c}
            </li>
          ))}
        </ul>
      </Seccion>
      <Aviso tono="pendiente" titulo="Pendiente de definición">
        <div className="flex flex-wrap gap-2">
          <Pendiente>cantidad de barrios clasificados</Pendiente>
          <Pendiente>cupos por categoría y modalidad</Pendiente>
          <Pendiente>formato</Pendiente>
          <Pendiente>fechas y sedes</Pendiente>
          <Pendiente>desempates</Pendiente>
        </div>
      </Aviso>
    </>
  );
}
