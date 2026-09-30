import Link from "next/link";
import type { ReactNode } from "react";
import * as A from "@/app/acciones";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { NOMBRE_CATEGORIA, nombreDe, nombreLiga } from "@/data/vistas";
import { invitacionActual } from "@/domain/convocatorias";
import { nombrePareja } from "@/domain/estado";
import { parejasActivasDeLiga } from "@/domain/ligas";
import { resumirMarcador } from "@/domain/marcador";
import { esAdminGeneral } from "@/domain/permisos";
import { formatoFechaHora } from "@/domain/tiempo";
import { CATEGORIAS } from "@/domain/types";
import {
  Aviso,
  Dato,
  Etiqueta,
  Pendiente,
  Titulo,
  Vacio,
  Volver,
} from "@/ui/kit";
import { Avatar } from "@/ui/avatar";
import { CamposMarcador } from "@/ui/marcador-form";
import { VistaConvocatoria } from "@/ui/convocatoria";

export const metadata = { title: "Administración" };

const V = "/admin";

function Panel({
  id,
  titulo,
  cantidad,
  children,
  abierto,
}: {
  id: string;
  titulo: string;
  cantidad?: number;
  children: ReactNode;
  abierto?: boolean;
}) {
  return (
    <details
      id={id}
      open={abierto}
      className="group mb-3 rounded-2xl border border-borde bg-superficie"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5">
        <span className="font-semibold">{titulo}</span>
        <span className="flex items-center gap-2">
          {cantidad !== undefined && (
            <Etiqueta tono={cantidad > 0 ? "alerta" : "neutro"}>
              {cantidad}
            </Etiqueta>
          )}
          <span className="text-tenue transition-transform group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>
      <div className="border-t border-borde p-4">{children}</div>
    </details>
  );
}

export default async function Admin() {
  const uid = await idUsuarioActual();
  const d = leer((e, ahora) => {
    const u = usuarioDe(e, uid);
    if (!esAdminGeneral(u)) return null;
    const jugadores = e.jugadores.filter((j) => j.residencia === "pendiente");
    const parejas = e.parejas.filter(
      (p) => p.estado === "pendiente_aprobacion",
    );
    const revision = e.partidos.filter((p) => p.estado === "en_revision");
    const inconclusos = e.partidos.filter(
      (p) =>
        p.estado === "inconcluso" ||
        (p.estado === "turno_propuesto" && p.marcadorParcial),
    );
    const confirmados = e.partidos
      .filter((p) => p.estado === "confirmado" && p.tipo === "liga")
      .reverse();
    const ligas = e.ligas.filter((l) => l.temporadaId === e.temporadaActualId);
    const conFoto = e.jugadores.filter((j) => j.foto);
    return {
      e,
      ahora,
      jugadores,
      parejas,
      revision,
      inconclusos,
      confirmados,
      ligas,
      conFoto,
    };
  });

  if (!d) {
    return (
      <>
        <Titulo>Administración</Titulo>
        <Vacio
          titulo="Acceso sólo para la administración"
          accion={
            <Link href="/ingresar" className="btn-secundario">
              Cambiar de usuario
            </Link>
          }
        >
          Los permisos se verifican en el servidor en cada acción, no sólo en
          esta pantalla.
        </Vacio>
      </>
    );
  }
  const { e, ahora } = d;

  return (
    <>
      <Titulo sobre="Administración general">Panel</Titulo>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Dato
          etiqueta="Perfiles a validar"
          valor={d.jugadores.length}
          destacado={d.jugadores.length > 0}
        />
        <Dato
          etiqueta="Parejas a aprobar"
          valor={d.parejas.length}
          destacado={d.parejas.length > 0}
        />
        <Dato
          etiqueta="Resultados en revisión"
          valor={d.revision.length}
          destacado={d.revision.length > 0}
        />
        <Dato etiqueta="Inconclusos" valor={d.inconclusos.length} />
      </div>

      <Panel
        id="perfiles"
        titulo="Validar residencia y categoría"
        cantidad={d.jugadores.length}
        abierto={d.jugadores.length > 0}
      >
        {d.jugadores.length === 0 && (
          <p className="text-sm text-suave">No hay perfiles pendientes.</p>
        )}
        <div className="space-y-3">
          {d.jugadores.map((j) => (
            <form
              key={j.id}
              action={A.adminValidarJugador}
              className="rounded-xl bg-superficie-2 p-3"
            >
              <Volver a={V} />
              <input type="hidden" name="jugadorId" value={j.id} />
              <p className="flex items-center gap-2 font-semibold">
                <Avatar
                  persona={{
                    nombre: `${j.nombre} ${j.apellido}`,
                    foto: j.foto,
                  }}
                  tamaño="md"
                />
                {j.nombre} {j.apellido}
              </p>
              <p className="mb-3 text-xs text-suave">
                {e.barrios.find((b) => b.id === j.barrioId)?.nombre} · declaró{" "}
                {NOMBRE_CATEGORIA[j.categoria]} · contacto (privado):{" "}
                {j.contacto}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="residencia"
                  className="campo"
                  defaultValue="validada"
                >
                  <option value="validada">Residencia validada</option>
                  <option value="rechazada">No validada</option>
                </select>
                <select
                  name="categoria"
                  className="campo"
                  defaultValue={j.categoria}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <input
                  name="motivo"
                  placeholder="Motivo (obligatorio si no se valida)"
                  className="campo col-span-2"
                />
                <button className="btn-primario col-span-2">Guardar</button>
              </div>
            </form>
          ))}
        </div>
      </Panel>

      <Panel
        id="parejas"
        titulo="Aprobar parejas"
        cantidad={d.parejas.length}
        abierto={d.parejas.length > 0}
      >
        {d.parejas.length === 0 && (
          <p className="text-sm text-suave">No hay parejas pendientes.</p>
        )}
        <div className="space-y-3">
          {d.parejas.map((p) => {
            const [a, b] = [p.jugadorAId, p.jugadorBId].map(
              (id) => e.jugadores.find((j) => j.id === id)!,
            );
            const difiere =
              a!.categoria !== p.categoria || b!.categoria !== p.categoria;
            return (
              <form
                key={p.id}
                action={A.adminAprobarPareja}
                className="rounded-xl bg-superficie-2 p-3"
              >
                <Volver a={V} />
                <input type="hidden" name="parejaId" value={p.id} />
                <p className="font-semibold">{nombrePareja(e, p)}</p>
                <p className="text-xs text-suave">{nombreLiga(e, p)}</p>
                {difiere && (
                  <p className="mt-1 text-xs text-alerta">
                    Revisá la categoría: {a!.nombre} es{" "}
                    {NOMBRE_CATEGORIA[a!.categoria]}, {b!.nombre} es{" "}
                    {NOMBRE_CATEGORIA[b!.categoria]}.
                  </p>
                )}
                <input
                  name="motivo"
                  placeholder="Motivo (obligatorio si se rechaza)"
                  className="campo mt-3"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    name="respuesta"
                    value="si"
                    className="btn-primario flex-1"
                  >
                    Aprobar
                  </button>
                  <button
                    name="respuesta"
                    value="no"
                    className="btn-secundario flex-1"
                  >
                    Rechazar
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </Panel>

      <Panel
        id="revision"
        titulo="Resultados en revisión"
        cantidad={d.revision.length}
        abierto={d.revision.length > 0}
      >
        {d.revision.length === 0 && (
          <p className="text-sm text-suave">
            No hay resultados discutidos ni sin respuesta.
          </p>
        )}
        <div className="space-y-3">
          {d.revision.map((p) => {
            const r = e.resultados.find((x) => x.id === p.resultadoVigenteId)!;
            const nA = nombreDe(e, p.parejaAId);
            const nB = nombreDe(e, p.parejaBId);
            return (
              <div key={p.id} className="rounded-xl bg-superficie-2 p-3">
                <div className="mb-1 flex flex-wrap gap-2">
                  <Etiqueta tono="alerta">
                    {r.estado === "discutido"
                      ? "Discutido"
                      : "Sin respuesta en 48 h"}
                  </Etiqueta>
                </div>
                <p className="font-semibold">
                  {nA} vs {nB}
                </p>
                <p className="text-sm text-suave">
                  Cargado por {nombreDe(e, r.cargadoPorParejaId!)}:{" "}
                  <span className="text-white tabular-nums">
                    {resumirMarcador(r.marcador)}
                  </span>
                </p>
                {r.motivoDiscrepancia && (
                  <p className="mt-1 text-sm text-alerta">
                    “{r.motivoDiscrepancia}”
                  </p>
                )}
                <form action={A.adminResolver} className="mt-3 space-y-3">
                  <Volver a={V} />
                  <input type="hidden" name="partidoId" value={p.id} />
                  <CamposMarcador
                    nombreA={nA}
                    nombreB={nB}
                    inicial={r.marcador}
                  />
                  <input
                    name="motivo"
                    required
                    placeholder="Cómo se resolvió (queda registrado)"
                    className="campo"
                  />
                  <button className="btn-primario w-full">
                    Confirmar este marcador
                  </button>
                </form>
                <form action={A.adminNoDisputado} className="mt-2 flex gap-2">
                  <Volver a={V} />
                  <input type="hidden" name="partidoId" value={p.id} />
                  <input
                    name="motivo"
                    required
                    placeholder="Motivo"
                    className="campo flex-1"
                  />
                  <button className="btn-peligro">No disputado</button>
                </form>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        id="inconclusos"
        titulo="Partidos inconclusos"
        cantidad={d.inconclusos.length}
      >
        <Aviso tono="pendiente">
          <p>
            La extensión del plazo para completarlos está pendiente.{" "}
            <Pendiente>extensión de plazo</Pendiente> No se vencen ni se
            sancionan automáticamente.
          </p>
        </Aviso>
        <ul className="space-y-2 text-sm">
          {d.inconclusos.map((p) => (
            <li key={p.id} className="rounded-xl bg-superficie-2 p-3">
              {nombreDe(e, p.parejaAId)} vs {nombreDe(e, p.parejaBId)} · quedó{" "}
              {p.marcadorParcial ? resumirMarcador(p.marcadorParcial) : "—"}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="ligas" titulo="Ligas">
        <Aviso tono="pendiente">
          <p>
            El mínimo de parejas para abrir una liga está pendiente{" "}
            <Pendiente>mínimo por liga</Pendiente>. Habilitar es una decisión
            manual y queda registrada.
          </p>
        </Aviso>
        <ul className="space-y-2">
          {d.ligas.map((l) => (
            <li key={l.id}>
              <form
                action={A.adminHabilitarLiga}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-superficie-2 p-3 text-sm"
              >
                <Volver a={V} />
                <input type="hidden" name="ligaId" value={l.id} />
                <input
                  type="hidden"
                  name="habilitar"
                  value={l.habilitada ? "no" : "si"}
                />
                <span className="min-w-48 flex-1">
                  <span className="font-medium">{nombreLiga(e, l)}</span>
                  <span className="block text-xs text-suave">
                    {parejasActivasDeLiga(e, l).length} parejas activas
                  </span>
                </span>
                {l.habilitada ? (
                  <Etiqueta tono="verde">En juego</Etiqueta>
                ) : (
                  <Etiqueta tono="contorno">En formación</Etiqueta>
                )}
                <input
                  name="motivo"
                  required
                  placeholder="Motivo"
                  className="campo min-h-9 w-full sm:w-44"
                />
                <button
                  className={
                    l.habilitada
                      ? "btn-secundario min-h-9"
                      : "btn-primario min-h-9"
                  }
                >
                  {l.habilitada ? "Suspender" : "Habilitar"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="corregir" titulo="Corregir un resultado confirmado">
        <p className="mb-3 text-sm text-suave">
          Revierte los puntos del resultado anterior, asigna los nuevos y
          conserva todas las versiones.
        </p>
        <div className="space-y-2">
          {d.confirmados.map((p) => {
            const r = e.resultados.find((x) => x.id === p.resultadoVigenteId)!;
            const nA = nombreDe(e, p.parejaAId);
            const nB = nombreDe(e, p.parejaBId);
            return (
              <details
                key={p.id}
                className="rounded-xl bg-superficie-2 p-3 text-sm"
              >
                <summary className="cursor-pointer">
                  {nA} vs {nB} ·{" "}
                  <span className="tabular-nums">
                    {resumirMarcador(r.marcador)}
                  </span>
                  {r.version > 1 && (
                    <span className="text-xs text-tenue"> · v{r.version}</span>
                  )}
                </summary>
                <form action={A.adminCorregir} className="mt-3 space-y-3">
                  <Volver a={V} />
                  <input type="hidden" name="partidoId" value={p.id} />
                  <CamposMarcador
                    nombreA={nA}
                    nombreB={nB}
                    inicial={r.marcador}
                  />
                  <input
                    name="motivo"
                    required
                    placeholder="Motivo de la corrección (obligatorio)"
                    className="campo"
                  />
                  <button className="btn-peligro w-full">
                    Corregir y recalcular
                  </button>
                </form>
              </details>
            );
          })}
        </div>
      </Panel>

      <Panel id="cortes" titulo="Cortes y convocatorias (simulación)">
        <Aviso tono="alerta" titulo="Etapa 2 en modo simulación">
          <p>
            Sirve para probar el mecanismo de convocatoria por mérito. No crea
            una copa real ni publica fechas.
          </p>
        </Aviso>
        <form
          action={A.adminCrearCorte}
          className="mb-4 grid gap-2 rounded-xl bg-superficie-2 p-3 sm:grid-cols-2"
        >
          <Volver a={`${V}#cortes`} />
          <p className="font-semibold sm:col-span-2">
            1. Congelar el ranking de una liga
          </p>
          <select name="ligaId" className="campo sm:col-span-2">
            {d.ligas
              .filter((l) => l.habilitada)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {nombreLiga(e, l)}
                </option>
              ))}
          </select>
          <fieldset className="sm:col-span-2">
            <legend className="etiqueta">
              Base de puntos <Pendiente>decisión del reglamento</Pendiente>
            </legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="base"
                  value="anual"
                  required
                  className="accent-verde"
                />{" "}
                Acumulado anual
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="base"
                  value="periodo"
                  className="accent-verde"
                />{" "}
                Sólo el período desde:
              </label>
              <input
                type="date"
                name="desde"
                className="campo min-h-9 w-auto"
              />
            </div>
          </fieldset>
          <input
            name="motivo"
            required
            placeholder="Para qué es el corte"
            className="campo sm:col-span-2"
          />
          <button className="btn-primario sm:col-span-2">Crear corte</button>
        </form>

        {e.cortes.length > 0 && (
          <form
            action={A.adminConvocar}
            className="mb-4 grid gap-2 rounded-xl bg-superficie-2 p-3 sm:grid-cols-2"
          >
            <Volver a={`${V}#cortes`} />
            <p className="font-semibold sm:col-span-2">
              2. Iniciar una convocatoria simulada
            </p>
            <select name="corteId" className="campo sm:col-span-2">
              {e.cortes.map((c) => (
                <option key={c.id} value={c.id}>
                  {nombreLiga(e, e.ligas.find((l) => l.id === c.ligaId)!)} ·{" "}
                  {formatoFechaHora(c.creadoEn)} · base {c.base}
                </option>
              ))}
            </select>
            <label className="sm:col-span-2">
              <span className="etiqueta">
                Plazo para confirmar, en horas{" "}
                <Pendiente>plazo de convocatoria</Pendiente>
              </span>
              <input
                name="plazoHoras"
                inputMode="numeric"
                required
                placeholder="Definilo explícitamente"
                className="campo"
              />
            </label>
            <button className="btn-primario sm:col-span-2">
              Convocar por orden de mérito
            </button>
          </form>
        )}

        <div className="space-y-3">
          {e.convocatorias.map((c) => (
            <div key={c.id}>
              <VistaConvocatoria e={e} c={c} ahora={ahora} />
              {invitacionActual(c) && (
                <form action={A.adminIncompleta} className="mt-2 flex gap-2">
                  <Volver a={`${V}#cortes`} />
                  <input type="hidden" name="convocatoriaId" value={c.id} />
                  <input
                    name="motivo"
                    required
                    placeholder="Qué integrante falta y por qué"
                    className="campo flex-1"
                  />
                  <button className="btn-secundario">Pareja incompleta</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel id="fotos" titulo="Fotos de perfil" cantidad={d.conFoto.length}>
        <p className="mb-3 text-sm text-suave">
          Si una foto es inapropiada, quitala con un motivo: queda registrado y
          se le avisa al jugador.
        </p>
        {d.conFoto.length === 0 && (
          <p className="text-sm text-suave">Nadie subió foto todavía.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {d.conFoto.map((j) => (
            <form
              key={j.id}
              action={A.adminQuitarFoto}
              className="flex items-center gap-3 rounded-xl bg-superficie-2 p-3"
            >
              <Volver a={`${V}#fotos`} />
              <input type="hidden" name="jugadorId" value={j.id} />
              <Avatar
                persona={{ nombre: `${j.nombre} ${j.apellido}`, foto: j.foto }}
                tamaño="md"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium">
                  {j.nombre} {j.apellido}
                </p>
                <div className="flex gap-2">
                  <input
                    name="motivo"
                    required
                    placeholder="Motivo"
                    className="campo min-h-9 flex-1"
                  />
                  <button className="btn-peligro min-h-9 px-3 text-xs">
                    Quitar
                  </button>
                </div>
              </div>
            </form>
          ))}
        </div>
      </Panel>

      <Panel id="registro" titulo="Registro de acciones">
        {e.acciones.length === 0 ? (
          <p className="text-sm text-suave">Sin acciones registradas.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {[...e.acciones]
              .reverse()
              .slice(0, 50)
              .map((a) => (
                <li key={a.id} className="rounded-xl bg-superficie-2 px-3 py-2">
                  <p>
                    <span className="font-medium">
                      {a.accion.replaceAll("_", " ")}
                    </span>{" "}
                    <span className="text-xs text-tenue">
                      · {e.usuarios.find((x) => x.id === a.usuarioId)?.nombre} ·{" "}
                      {formatoFechaHora(a.fecha)}
                    </span>
                  </p>
                  {(a.motivo || a.detalle) && (
                    <p className="text-xs text-suave">
                      {a.motivo}
                      {a.motivo && a.detalle ? " · " : ""}
                      {a.detalle}
                    </p>
                  )}
                </li>
              ))}
          </ol>
        )}
      </Panel>

      <Panel id="demo" titulo="Demo">
        <p className="mb-3 text-sm text-suave">
          {e.jugadores.filter((j) => j.ficticio).length} jugadores ficticios.
          Reiniciar vuelve a los datos de ejemplo y borra lo que se haya
          cargado.
        </p>
        <form action={A.adminReiniciarDemo}>
          <Volver a={V} />
          <button className="btn-peligro w-full">Reiniciar la demo</button>
        </form>
      </Panel>
    </>
  );
}
