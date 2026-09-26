import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { Aviso, Etiqueta, Pendiente, Seccion, Titulo, Vacio } from "@/ui/kit";
import { VistaConvocatoria } from "@/ui/convocatoria";

export const metadata = { title: "Copas" };

const PASOS = [
  [
    "Corte del ranking",
    "Se congela una copia del ranking de cada liga local. Los partidos posteriores cuentan para el próximo corte.",
  ],
  [
    "Invitación por mérito",
    "Se invita a la pareja ubicada primera. Una plaza por barrio, categoría y modalidad habilitada.",
  ],
  [
    "Reemplazo en orden",
    "Si no puede, rechaza o no confirma a tiempo, se invita a la siguiente del corte, y así hasta cubrir la plaza.",
  ],
  [
    "Pareja completa",
    "Clasifica la pareja: si falta un integrante, la oportunidad pasa a la siguiente pareja completa. No se sustituyen integrantes.",
  ],
  [
    "Sin elección a dedo",
    "Ni capitanes ni administradores eligen a otra pareja salteando el ranking.",
  ],
];

export default async function Copas() {
  const uid = await idUsuarioActual();
  const d = leer((e, ahora) => {
    const u = usuarioDe(e, uid);
    return {
      convocatorias: e.convocatorias.map((c) => (
        <VistaConvocatoria
          key={c.id}
          e={e}
          c={c}
          ahora={ahora}
          jugadorId={u?.jugadorId}
        />
      )),
    };
  });

  return (
    <>
      <Titulo sobre="Etapa 2 · entre barrios">Copas</Titulo>

      <Vacio titulo="Todavía no hay copas programadas">
        La primera copa está prevista al terminar el piloto de tres meses.
        Fechas, sedes y formato se publican cuando estén definidos.
      </Vacio>

      <Seccion titulo="Cómo se clasifica" className="mt-8">
        <ol className="space-y-2">
          {PASOS.map(([t, d], i) => (
            <li key={t} className="tarjeta flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-verde text-sm font-bold text-black">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-sm text-suave">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo="Todavía por definir">
        <div className="flex flex-wrap gap-2">
          <Pendiente>formato de las copas</Pendiente>
          <Pendiente>plazo para confirmar</Pendiente>
          <Pendiente>puntaje de copas</Pendiente>
          <Pendiente>desempates del ranking local</Pendiente>
          <Pendiente>base de puntos del corte</Pendiente>
        </div>
      </Seccion>

      {d.convocatorias.length > 0 && (
        <Seccion
          titulo="Convocatorias"
          extra={<Etiqueta tono="alerta">Demo</Etiqueta>}
        >
          <Aviso tono="alerta">
            <p>
              Estas convocatorias son simulaciones creadas desde la
              administración de la demo para mostrar el mecanismo. No
              corresponden a una copa real.
            </p>
          </Aviso>
          <div className="space-y-3">{d.convocatorias}</div>
        </Seccion>
      )}
    </>
  );
}
