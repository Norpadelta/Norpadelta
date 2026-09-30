import Link from "next/link";
import { marcarLeidas, quitarMiFoto, subirFoto } from "@/app/acciones";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { NOMBRE_CATEGORIA, NOMBRE_MODALIDAD } from "@/data/vistas";
import { formatoFechaHora } from "@/domain/tiempo";
import { Etiqueta, Seccion, Titulo, Vacio, Volver } from "@/ui/kit";
import { SubirFoto } from "@/ui/subir-foto";

export const metadata = { title: "Mi perfil" };

const RESIDENCIA = {
  pendiente: { texto: "En revisión", tono: "alerta" },
  validada: { texto: "Validada", tono: "verde" },
  rechazada: { texto: "No validada", tono: "error" },
} as const;

export default async function Perfil() {
  const uid = await idUsuarioActual();
  const d = leer((e) => {
    const u = usuarioDe(e, uid);
    const j = u?.jugadorId
      ? e.jugadores.find((x) => x.id === u.jugadorId)
      : undefined;
    if (!u || !j) return null;
    return {
      j,
      barrio: e.barrios.find((b) => b.id === j.barrioId)?.nombre ?? "—",
      avisos: e.notificaciones
        .filter((n) => n.usuarioId === u.id)
        .slice(-15)
        .reverse(),
    };
  });

  if (!d) {
    return (
      <>
        <Titulo>Mi perfil</Titulo>
        <Vacio
          titulo="Ingresá con tu perfil de jugador"
          accion={
            <Link href="/ingresar" className="btn-primario">
              Ingresá
            </Link>
          }
        />
      </>
    );
  }
  const { j } = d;
  const nombre = `${j.nombre} ${j.apellido}`;
  const sinLeer = d.avisos.filter((a) => !a.leida).length;

  return (
    <>
      <Titulo sobre={d.barrio}>{nombre}</Titulo>

      <Seccion titulo="Foto de perfil">
        <form action={subirFoto} className="tarjeta space-y-4">
          <Volver a="/perfil" />
          <SubirFoto nombre={nombre} actual={j.foto} />
          <button className="btn-primario w-full sm:w-auto">
            Guardar foto
          </button>
        </form>
        {j.foto && (
          <form action={quitarMiFoto} className="mt-2">
            <Volver a="/perfil" />
            <button className="text-sm text-suave underline hover:text-white">
              Quitar mi foto
            </button>
          </form>
        )}
      </Seccion>

      <Seccion titulo="Tus datos">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-superficie px-3 py-2">
            <dt className="text-[11px] text-tenue uppercase">Barrio</dt>
            <dd className="font-medium">{d.barrio}</dd>
          </div>
          <div className="rounded-xl bg-superficie px-3 py-2">
            <dt className="text-[11px] text-tenue uppercase">Residencia</dt>
            <dd>
              <Etiqueta tono={RESIDENCIA[j.residencia].tono}>
                {RESIDENCIA[j.residencia].texto}
              </Etiqueta>
            </dd>
          </div>
          <div className="rounded-xl bg-superficie px-3 py-2">
            <dt className="text-[11px] text-tenue uppercase">Categoría</dt>
            <dd className="font-medium">
              {NOMBRE_CATEGORIA[j.categoria]}
              {!j.categoriaValidada && (
                <span className="text-xs text-tenue"> · por validar</span>
              )}
            </dd>
          </div>
          <div className="rounded-xl bg-superficie px-3 py-2">
            <dt className="text-[11px] text-tenue uppercase">Modalidades</dt>
            <dd className="font-medium">
              {j.modalidades.map((m) => NOMBRE_MODALIDAD[m]).join(", ")}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-tenue">
          Tu contacto sólo lo ve la administración. Para cambiar barrio o
          categoría, escribile a la administración.
        </p>
      </Seccion>

      <Seccion
        titulo={`Avisos${sinLeer ? ` (${sinLeer} sin leer)` : ""}`}
        extra={
          sinLeer > 0 && (
            <form action={marcarLeidas}>
              <Volver a="/perfil" />
              <button className="text-xs text-suave underline hover:text-white">
                Marcar como leídos
              </button>
            </form>
          )
        }
      >
        {d.avisos.length === 0 ? (
          <p className="text-sm text-suave">No tenés avisos.</p>
        ) : (
          <ul className="divide-y divide-borde rounded-2xl border border-borde bg-superficie">
            {d.avisos.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 px-4 py-3 text-sm"
              >
                <span
                  className={
                    a.leida
                      ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-borde"
                      : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-verde"
                  }
                />
                <span className="flex-1">
                  {a.href ? (
                    <Link href={a.href} className="hover:text-verde">
                      {a.texto}
                    </Link>
                  ) : (
                    a.texto
                  )}
                  <span className="block text-xs text-tenue capitalize">
                    {formatoFechaHora(a.creadaEn)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Link href="/ingresar" className="text-sm text-suave underline">
        Cambiar de usuario (demo)
      </Link>
    </>
  );
}
