import { leer } from "@/data/store";
import { Aviso, EnlaceTarjeta, Etiqueta, Titulo } from "@/ui/kit";

export const metadata = { title: "Barrios" };

export default function Barrios() {
  const barrios = leer((e) =>
    e.barrios.map((b) => ({
      ...b,
      ligasEnJuego: e.ligas.filter((l) => l.barrioId === b.id && l.habilitada)
        .length,
      parejas: e.parejas.filter(
        (p) => p.barrioId === b.id && p.estado === "activa",
      ).length,
    })),
  );
  return (
    <>
      <Titulo sobre="Nordelta">Barrios</Titulo>
      <Aviso tono="pendiente">
        <p>
          Norpadelta está pensado para todos los barrios de Nordelta. El piloto
          arranca en Castaños; los demás barrios se suman a medida que confirmen
          su participación. No mostramos barrios como adheridos sin
          confirmación.
        </p>
      </Aviso>
      <div className="grid gap-3 sm:grid-cols-2">
        {barrios.map((b) => (
          <EnlaceTarjeta key={b.id} href={`/barrios/${b.slug}`}>
            <div className="mb-2 flex flex-wrap gap-2">
              {b.estado === "piloto" && (
                <Etiqueta tono="verde">Piloto</Etiqueta>
              )}
              {b.estado === "activo" && (
                <Etiqueta tono="verde">Adherido</Etiqueta>
              )}
              {b.estado === "en_evaluacion" && (
                <Etiqueta tono="contorno">Sin confirmar</Etiqueta>
              )}
              {b.ficticio && <Etiqueta tono="alerta">Ficticio · demo</Etiqueta>}
            </div>
            <p className="text-lg font-bold">{b.nombre}</p>
            <p className="text-sm text-suave">
              {b.parejas} parejas activas · {b.ligasEnJuego}{" "}
              {b.ligasEnJuego === 1 ? "liga en juego" : "ligas en juego"}
            </p>
          </EnlaceTarjeta>
        ))}
      </div>
    </>
  );
}
