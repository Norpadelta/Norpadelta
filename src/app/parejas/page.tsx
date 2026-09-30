import Link from "next/link";
import * as A from "@/app/acciones";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { integrantes, NOMBRE_CATEGORIA, NOMBRE_MODALIDAD } from "@/data/vistas";
import { AvatarPareja } from "@/ui/avatar";
import { nombreJugador, nombrePareja } from "@/domain/estado";
import { parejaVigente } from "@/domain/parejas";
import { calcularRanking } from "@/domain/ranking";
import { ligaDePareja } from "@/domain/ligas";
import type { EstadoPareja, Modalidad } from "@/domain/types";
import { Aviso, Etiqueta, Seccion, Titulo, Vacio, Volver } from "@/ui/kit";

export const metadata = { title: "Parejas" };

const V = "/parejas";

const ESTADO: Record<
  EstadoPareja,
  { texto: string; tono: "verde" | "neutro" | "alerta" | "contorno" }
> = {
  invitacion: { texto: "Esperando confirmación", tono: "alerta" },
  pendiente_aprobacion: { texto: "Esperando aprobación", tono: "alerta" },
  activa: { texto: "Activa", tono: "verde" },
  rechazada: { texto: "Rechazada", tono: "neutro" },
  disuelta: { texto: "Disuelta", tono: "contorno" },
};

export default async function Parejas() {
  const uid = await idUsuarioActual();
  const d = leer((e) => {
    const u = usuarioDe(e, uid);
    const j = u?.jugadorId
      ? e.jugadores.find((x) => x.id === u.jugadorId)
      : undefined;
    const barrio = j ? e.barrios.find((b) => b.id === j.barrioId) : undefined;
    const mias = j
      ? e.parejas
          .filter((p) => p.jugadorAId === j.id || p.jugadorBId === j.id)
          .map((p) => {
            const liga = ligaDePareja(e, p);
            const pts = liga
              ? (calcularRanking(e, liga.id).find((f) => f.parejaId === p.id)
                  ?.puntos ?? 0)
              : 0;
            const companero =
              p.jugadorAId === j.id ? p.jugadorBId : p.jugadorAId;
            return {
              p,
              companero: nombreJugador(e, companero),
              pts,
              soyInvitado: p.jugadorBId === j.id,
            };
          })
          .sort(
            (a, b) =>
              Number(b.p.estado === "activa") - Number(a.p.estado === "activa"),
          )
      : [];
    const libres = j
      ? j.modalidades
          .filter((m) => !parejaVigente(e, j.id, m))
          .map((m) => ({
            modalidad: m,
            candidatos: e.jugadores
              .filter(
                (x) =>
                  x.id !== j.id &&
                  x.barrioId === j.barrioId &&
                  x.residencia === "validada" &&
                  x.modalidades.includes(m) &&
                  !parejaVigente(e, x.id, m),
              )
              .map((x) => ({
                id: x.id,
                nombre: `${x.nombre} ${x.apellido}`,
                categoria: NOMBRE_CATEGORIA[x.categoria],
              })),
          }))
      : [];
    const delBarrio = barrio
      ? e.parejas
          .filter((p) => p.barrioId === barrio.id && p.estado === "activa")
          .map((p) => ({
            id: p.id,
            nombre: nombrePareja(e, p),
            integrantes: integrantes(e, p, true),
            cat: NOMBRE_CATEGORIA[p.categoria],
            mod: NOMBRE_MODALIDAD[p.modalidad],
          }))
      : [];
    return { j, barrio, mias, libres, delBarrio };
  });

  if (!d.j) {
    return (
      <>
        <Titulo>Parejas</Titulo>
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

  return (
    <>
      <Titulo sobre={d.barrio?.nombre}>Parejas</Titulo>

      <Seccion titulo="Tus parejas">
        {d.mias.length === 0 ? (
          <Vacio titulo="Todavía no formaste pareja">
            Invitá a tu compañero/a abajo. Cuando confirme y la administración
            la apruebe, entran a la liga.
          </Vacio>
        ) : (
          <div className="space-y-3">
            {d.mias.map(({ p, companero, pts, soyInvitado }) => (
              <div key={p.id} className="tarjeta">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Etiqueta tono={ESTADO[p.estado].tono}>
                    {ESTADO[p.estado].texto}
                  </Etiqueta>
                  <span className="text-xs text-tenue">
                    {NOMBRE_MODALIDAD[p.modalidad]} ·{" "}
                    {NOMBRE_CATEGORIA[p.categoria]}
                  </span>
                </div>
                <p className="font-semibold">Con {companero}</p>
                {(p.estado === "activa" || p.estado === "disuelta") && (
                  <p className="text-sm text-suave">
                    {pts} puntos de liga
                    {p.estado === "disuelta"
                      ? " · quedan con esta pareja, no se transfieren"
                      : ""}
                  </p>
                )}
                {p.estado === "invitacion" && soyInvitado && (
                  <form action={A.responderPareja} className="mt-3 flex gap-2">
                    <Volver a={V} />
                    <input type="hidden" name="parejaId" value={p.id} />
                    <button
                      name="respuesta"
                      value="si"
                      className="btn-primario flex-1"
                    >
                      Confirmá la pareja
                    </button>
                    <button
                      name="respuesta"
                      value="no"
                      className="btn-secundario flex-1"
                    >
                      Rechazá
                    </button>
                  </form>
                )}
                {p.estado === "activa" && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-suave underline">
                      Cambiar de compañero/a
                    </summary>
                    <form action={A.disolver} className="mt-3 space-y-2">
                      <Volver a={V} />
                      <input type="hidden" name="parejaId" value={p.id} />
                      <Aviso tono="alerta">
                        <p>
                          Esta pareja se disuelve y conserva sus {pts} puntos y
                          su historial. La nueva pareja empieza de cero.
                        </p>
                        <p>
                          Los desafíos pendientes se cancelan sin puntos para
                          nadie.
                        </p>
                      </Aviso>
                      <input
                        name="motivo"
                        placeholder="Motivo (opcional)"
                        className="campo"
                      />
                      <button className="btn-peligro w-full">
                        Disolver la pareja
                      </button>
                    </form>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {d.j.residencia !== "validada" ? (
        <Aviso titulo="Primero validamos tu perfil">
          <p>
            Cuando la administración valide tu residencia vas a poder invitar a
            tu compañero/a.
          </p>
        </Aviso>
      ) : (
        d.libres.map(({ modalidad, candidatos }) => (
          <Seccion
            key={modalidad}
            titulo={`Invitá a tu pareja · ${NOMBRE_MODALIDAD[modalidad as Modalidad]}`}
          >
            {candidatos.length === 0 ? (
              <Vacio titulo="No hay jugadores disponibles en tu barrio para esta modalidad">
                Tu compañero/a tiene que registrarse y estar validado/a en{" "}
                {d.barrio?.nombre}.
              </Vacio>
            ) : (
              <form
                action={A.invitar}
                className="tarjeta flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <Volver a={V} />
                <input type="hidden" name="modalidad" value={modalidad} />
                <label className="flex-1">
                  <span className="etiqueta">
                    Compañero/a de {d.barrio?.nombre}
                  </span>
                  <select name="companeroId" className="campo" required>
                    {candidatos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} · {c.categoria}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn-primario">Invitá</button>
              </form>
            )}
          </Seccion>
        ))
      )}

      <Aviso tono="pendiente" titulo="Parejas de distintos barrios">
        <p>
          Todavía no están reglamentadas. Por ahora cada pareja se forma con
          residentes del mismo barrio.
        </p>
      </Aviso>

      <Seccion titulo={`Parejas activas de ${d.barrio?.nombre ?? "tu barrio"}`}>
        <ul className="divide-y divide-borde rounded-2xl border border-borde bg-superficie">
          {d.delBarrio.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2 font-medium">
                <AvatarPareja integrantes={p.integrantes} />
                {p.nombre}
              </span>
              <span className="text-xs text-suave">
                {p.mod} · {p.cat}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-tenue">
          Los datos de contacto no se muestran públicamente.
        </p>
      </Seccion>
    </>
  );
}
