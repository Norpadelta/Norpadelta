import Link from "next/link";
import { ingresar, salir } from "@/app/acciones";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { ID_ADMIN } from "@/data/semilla";
import { Aviso, Etiqueta, Seccion, Titulo } from "@/ui/kit";

export const metadata = { title: "Ingresá" };

export default async function Ingresar() {
  const uid = await idUsuarioActual();
  const d = leer((e) => {
    const actual = usuarioDe(e, uid);
    const perfiles = e.usuarios
      .filter((u) => u.id !== ID_ADMIN)
      .map((u) => {
        const j = e.jugadores.find((x) => x.id === u.jugadorId);
        return {
          id: u.id,
          nombre: u.nombre,
          barrio: e.barrios.find((b) => b.id === j?.barrioId)?.nombre,
          pendiente: j?.residencia === "pendiente",
        };
      });
    const destacados = [
      "Tomás Ríos",
      "Martín Sosa",
      "Ana Gómez",
      "Ramiro Soto",
    ];
    return {
      actual,
      destacados: destacados
        .map((n) => perfiles.find((p) => p.nombre === n))
        .filter((p) => !!p),
      resto: perfiles.filter((p) => !destacados.includes(p.nombre)),
      noLeidas: actual
        ? e.notificaciones
            .filter((n) => n.usuarioId === actual.id)
            .slice(-8)
            .reverse()
        : [],
    };
  });

  const Boton = ({
    id,
    children,
    destino,
  }: {
    id: string;
    children: React.ReactNode;
    destino?: string;
  }) => (
    <form action={ingresar}>
      <input type="hidden" name="usuarioId" value={id} />
      {destino && <input type="hidden" name="destino" value={destino} />}
      <button className="tarjeta flex w-full items-center justify-between gap-3 text-left hover:border-verde">
        {children}
      </button>
    </form>
  );

  return (
    <>
      <Titulo sobre="Acceso simulado">Ingresá</Titulo>
      <Aviso tono="alerta" titulo="Esto es una demo">
        <p>
          Elegí un perfil ficticio para recorrer la plataforma. En la versión
          real cada persona ingresa con su propia cuenta.
        </p>
      </Aviso>

      {d.actual && (
        <Seccion titulo="Sesión actual">
          <div className="tarjeta">
            <p className="font-semibold">{d.actual.nombre}</p>
            {d.noLeidas.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-suave">
                {d.noLeidas.map((n) => (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} className="hover:text-white">
                        • {n.texto}
                      </Link>
                    ) : (
                      <>• {n.texto}</>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <form action={salir} className="mt-3">
              <button className="btn-secundario w-full">Salir</button>
            </form>
          </div>
        </Seccion>
      )}

      <Seccion titulo="Perfiles sugeridos">
        <div className="space-y-2">
          {d.destacados.map((p) => (
            <Boton key={p.id} id={p.id}>
              <span>
                <span className="block font-semibold">{p.nombre}</span>
                <span className="text-xs text-suave">
                  {p.nombre === "Tomás Ríos" &&
                    "Tiene un desafío y un resultado para validar"}
                  {p.nombre === "Martín Sosa" &&
                    "Desafió a Tomás y discutió un resultado"}
                  {p.nombre === "Ana Gómez" &&
                    "Recién registrada, espera validación"}
                  {p.nombre === "Ramiro Soto" &&
                    "Juega en un barrio ficticio: sólo amistosos"}
                </span>
              </span>
              <span className="text-xs text-tenue">{p.barrio}</span>
            </Boton>
          ))}
          <Boton id={ID_ADMIN} destino="admin">
            <span>
              <span className="block font-semibold">Joaquín (Joaco)</span>
              <span className="text-xs text-suave">Administración general</span>
            </span>
            <Etiqueta tono="verde">Admin</Etiqueta>
          </Boton>
        </div>
      </Seccion>

      <Seccion titulo="Nuevo en Norpadelta">
        <Link href="/registro" className="btn-primario w-full">
          Registrate
        </Link>
      </Seccion>

      <Seccion titulo="Otros perfiles ficticios">
        <div className="grid gap-2 sm:grid-cols-2">
          {d.resto.map((p) => (
            <Boton key={p.id} id={p.id}>
              <span className="text-sm font-medium">{p.nombre}</span>
              <span className="text-xs text-tenue">
                {p.pendiente ? "Por validar" : p.barrio}
              </span>
            </Boton>
          ))}
        </div>
      </Seccion>
    </>
  );
}
