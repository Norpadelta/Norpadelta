import Link from "next/link";
import type { ReactNode } from "react";
import * as A from "@/app/acciones";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { nombreDe, nombreLiga } from "@/data/vistas";
import { nombreJugador, type Estado } from "@/domain/estado";
import { resumirMarcador } from "@/domain/marcador";
import {
  esFuturo,
  fechaBA,
  formatoFechaHora,
  tiempoRestante,
} from "@/domain/tiempo";
import type { Desafio, Partido, Resultado } from "@/domain/types";
import { Aviso, Etiqueta, Seccion, Titulo, Vacio, Volver } from "@/ui/kit";
import { CamposMarcador } from "@/ui/marcador-form";

export const metadata = { title: "Mis partidos" };

const V = "/mis-partidos";

type Tarea =
  | { tipo: "desafio_recibido"; d: Desafio }
  | { tipo: "coordinar"; p: Partido }
  | { tipo: "confirmar_turno"; p: Partido }
  | { tipo: "jugar"; p: Partido }
  | { tipo: "cargar"; p: Partido }
  | { tipo: "validar"; p: Partido; r: Resultado };

export default async function MisPartidos() {
  const uid = await idUsuarioActual();
  const d = leer((e, ahora) => {
    const u = usuarioDe(e, uid);
    const j = u?.jugadorId
      ? e.jugadores.find((x) => x.id === u.jugadorId)
      : undefined;
    if (!j) return null;
    const mias = new Set(
      e.parejas
        .filter((p) => p.jugadorAId === j.id || p.jugadorBId === j.id)
        .map((p) => p.id),
    );
    const propia = (a: string, b: string) => (mias.has(a) ? a : b);

    const tareas: Tarea[] = [];
    const espera: ReactNode[] = [];
    const historial: { id: string; texto: ReactNode }[] = [];

    for (const des of e.desafios.filter(
      (x) => mias.has(x.retadoraId) || mias.has(x.retadaId),
    )) {
      if (des.estado === "pendiente" && mias.has(des.retadaId))
        tareas.push({ tipo: "desafio_recibido", d: des });
      else if (des.estado === "pendiente")
        espera.push(
          <DesafioEnviado key={des.id} e={e} d={des} ahora={ahora} />,
        );
      else if (!des.partidoId)
        historial.push({
          id: des.id,
          texto: (
            <LineaDesafio
              e={e}
              d={des}
              propia={propia(des.retadoraId, des.retadaId)}
            />
          ),
        });
    }
    for (const p of e.partidos.filter(
      (x) => mias.has(x.parejaAId) || mias.has(x.parejaBId),
    )) {
      const mia = propia(p.parejaAId, p.parejaBId);
      const r = p.resultadoVigenteId
        ? e.resultados.find((x) => x.id === p.resultadoVigenteId)
        : undefined;
      if (p.estado === "por_coordinar" || p.estado === "inconcluso")
        tareas.push({ tipo: "coordinar", p });
      else if (
        p.estado === "turno_propuesto" &&
        !p.turno!.confirmadoPor.includes(mia)
      )
        tareas.push({ tipo: "confirmar_turno", p });
      else if (p.estado === "turno_propuesto")
        espera.push(
          <Esperando
            key={p.id}
            e={e}
            p={p}
            texto="Esperando que el rival confirme el turno."
          />,
        );
      else if (p.estado === "programado")
        tareas.push({
          tipo: esFuturo(p.turno!.inicio, ahora) ? "jugar" : "cargar",
          p,
        });
      else if (
        p.estado === "resultado_cargado" &&
        r &&
        r.cargadoPorParejaId !== mia
      )
        tareas.push({ tipo: "validar", p, r });
      else if (p.estado === "resultado_cargado" && r)
        espera.push(
          <Esperando
            key={p.id}
            e={e}
            p={p}
            texto={`Cargaste ${resumirMarcador(r.marcador)}. El rival lo valida (${tiempoRestante(r.validarAntes, ahora)}).`}
          />,
        );
      else if (p.estado === "en_revision")
        espera.push(
          <Esperando
            key={p.id}
            e={e}
            p={p}
            texto="En revisión: la administración va a resolver el resultado. Todavía no suma puntos."
          />,
        );
      else
        historial.push({
          id: p.id,
          texto: <LineaPartido e={e} p={p} r={r} mia={mia} />,
        });
    }
    return {
      tareas: tareas.map((t) => (
        <TareaCard
          key={"d" in t ? t.d.id : t.p.id}
          e={e}
          t={t}
          ahora={ahora}
          jugadorId={j.id}
          mias={mias}
        />
      )),
      espera,
      historial: historial.reverse(),
    };
  });

  if (!d) {
    return (
      <>
        <Titulo>Mis partidos</Titulo>
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
      <Titulo sobre="Desafiá, coordiná, jugá">Mis partidos</Titulo>
      <Seccion titulo={`Para hacer (${d.tareas.length})`}>
        {d.tareas.length ? (
          <div className="space-y-3">{d.tareas}</div>
        ) : (
          <Vacio
            titulo="No tenés nada pendiente"
            accion={
              <Link href="/mi-liga" className="btn-primario">
                Desafiá a una pareja
              </Link>
            }
          >
            Elegí un rival de tu liga y mandale un desafío.
          </Vacio>
        )}
      </Seccion>
      {d.espera.length > 0 && (
        <Seccion titulo="Esperando al rival o a la administración">
          <div className="space-y-3">{d.espera}</div>
        </Seccion>
      )}
      <Seccion titulo="Historial">
        {d.historial.length ? (
          <ul className="divide-y divide-borde rounded-2xl border border-borde bg-superficie">
            {d.historial.map((h) => (
              <li key={h.id} className="px-4 py-3 text-sm">
                {h.texto}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-suave">Todavía no jugaste partidos.</p>
        )}
      </Seccion>
    </>
  );
}

function TipoEtiqueta({ tipo }: { tipo: string }) {
  return tipo === "liga" ? (
    <Etiqueta tono="verde">Liga · oficial</Etiqueta>
  ) : (
    <Etiqueta tono="contorno">Amistoso · no suma puntos</Etiqueta>
  );
}

function Cabecera({
  e,
  p,
  children,
}: {
  e: Estado;
  p: Partido;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TipoEtiqueta tipo={p.tipo} />
        {p.ligaId && (
          <span className="text-xs text-tenue">
            {nombreLiga(e, e.ligas.find((l) => l.id === p.ligaId)!)}
          </span>
        )}
        {children}
      </div>
      <p className="font-semibold">
        {nombreDe(e, p.parejaAId)} <span className="text-tenue">vs</span>{" "}
        {nombreDe(e, p.parejaBId)}
      </p>
    </div>
  );
}

function DatosTurno({ e, p }: { e: Estado; p: Partido }) {
  if (!p.turno) return null;
  const sede = e.barrios.find((b) => b.id === p.turno!.barrioSedeId);
  return (
    <dl className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-superficie-2 p-3 text-sm">
      <div>
        <dt className="text-[11px] text-tenue uppercase">Cuándo</dt>
        <dd className="font-medium capitalize">
          {formatoFechaHora(p.turno.inicio)}
        </dd>
      </div>
      <div>
        <dt className="text-[11px] text-tenue uppercase">Dónde</dt>
        <dd className="font-medium">
          {sede?.nombre} · {p.turno.cancha}
        </dd>
      </div>
      <div className="col-span-2">
        <dt className="text-[11px] text-tenue uppercase">Reserva</dt>
        <dd className="text-suave">
          La gestiona {nombreJugador(e, p.turno.reservaGestionadaPorId)}
          {p.turno.sistemaReservas ? ` en ${p.turno.sistemaReservas}` : ""}.
          Norpadelta no reserva canchas.
        </dd>
      </div>
    </dl>
  );
}

function TareaCard({
  e,
  t,
  ahora,
  jugadorId,
  mias,
}: {
  e: Estado;
  t: Tarea;
  ahora: string;
  jugadorId: string;
  mias: Set<string>;
}) {
  if (t.tipo === "desafio_recibido") {
    const d = t.d;
    return (
      <div className="tarjeta border-verde/40">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <TipoEtiqueta tipo={d.tipo} />
          <Etiqueta tono="alerta">
            Respondé: {tiempoRestante(d.responderAntes, ahora)}
          </Etiqueta>
        </div>
        <p className="mb-1 font-semibold">
          {nombreDe(e, d.retadoraId)} te desafió
        </p>
        <p className="mb-3 text-sm text-suave">
          {d.tipo === "liga"
            ? "Si aceptás, queda como partido oficial de liga y tienen 10 días para jugarlo."
            : "Es un amistoso: se juega por el gusto de jugar y no modifica ningún ranking."}
        </p>
        <form action={A.responderDesafio} className="flex gap-2">
          <Volver a={V} />
          <input type="hidden" name="desafioId" value={d.id} />
          <button name="respuesta" value="si" className="btn-primario flex-1">
            Aceptá
          </button>
          <button name="respuesta" value="no" className="btn-secundario flex-1">
            Rechazá
          </button>
        </form>
      </div>
    );
  }

  const p = t.p;
  const mia = mias.has(p.parejaAId) ? p.parejaAId : p.parejaBId;
  const desafio = p.desafioId
    ? e.desafios.find((x) => x.id === p.desafioId)
    : undefined;

  if (t.tipo === "coordinar") {
    const pa = e.parejas.find((x) => x.id === p.parejaAId)!;
    const pb = e.parejas.find((x) => x.id === p.parejaBId)!;
    const sedes = e.barrios.filter((b) =>
      p.tipo === "liga"
        ? b.id === pa.barrioId
        : b.id === pa.barrioId || b.id === pb.barrioId,
    );
    const jugadores = [
      pa.jugadorAId,
      pa.jugadorBId,
      pb.jugadorAId,
      pb.jugadorBId,
    ];
    const hoy = fechaBA(ahora);
    return (
      <div className="tarjeta">
        <Cabecera e={e} p={p}>
          {p.estado === "inconcluso" ? (
            <Etiqueta tono="alerta">Inconcluso</Etiqueta>
          ) : (
            desafio?.jugarAntes && (
              <Etiqueta tono="alerta">
                Jugar: {tiempoRestante(desafio.jugarAntes, ahora)}
              </Etiqueta>
            )
          )}
        </Cabecera>
        {p.estado === "inconcluso" && p.marcadorParcial && (
          <Aviso
            tono="alerta"
            titulo={`Quedó ${resumirMarcador(p.marcadorParcial)}`}
          >
            <p>
              No suma puntos hasta terminarlo y validarlo. Coordinen otro turno
              para completarlo.
            </p>
          </Aviso>
        )}
        <details className="group" open={p.estado !== "inconcluso"}>
          <summary className="btn-secundario w-full cursor-pointer list-none">
            Proponé un turno
          </summary>
          <form
            action={A.proponerTurno}
            className="mt-3 grid grid-cols-2 gap-3"
          >
            <Volver a={V} />
            <input type="hidden" name="partidoId" value={p.id} />
            <label className="col-span-1">
              <span className="etiqueta">Fecha</span>
              <input
                type="date"
                name="fecha"
                min={hoy}
                required
                className="campo"
              />
            </label>
            <label className="col-span-1">
              <span className="etiqueta">Hora</span>
              <input
                type="time"
                name="hora"
                step={900}
                required
                className="campo"
              />
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="etiqueta">Barrio anfitrión</span>
              <select name="barrioSedeId" className="campo">
                {sedes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="etiqueta">Cancha</span>
              <input
                name="cancha"
                required
                placeholder="Cancha 1"
                list={`canchas-${p.id}`}
                className="campo"
              />
              <datalist id={`canchas-${p.id}`}>
                {Array.from({ length: sedes[0]?.sede.canchas ?? 0 }, (_, i) => (
                  <option key={i} value={`Cancha ${i + 1}`} />
                ))}
              </datalist>
            </label>
            <label className="col-span-2">
              <span className="etiqueta">
                ¿Quién reserva? (residente del barrio anfitrión)
              </span>
              <select
                name="gestorId"
                defaultValue={jugadorId}
                className="campo"
              >
                {jugadores.map((id) => (
                  <option key={id} value={id}>
                    {nombreJugador(e, id)}
                  </option>
                ))}
              </select>
            </label>
            <p className="col-span-2 text-xs text-suave">
              Primero reservá en el sistema del barrio
              {sedes[0]?.sede.sistemaReservas
                ? ` (${sedes[0].sede.sistemaReservas})`
                : ""}{" "}
              y después registrá acá el turno acordado.
              {p.tipo !== "liga" &&
                " Si juegan en otro barrio, confirmá antes las condiciones de ingreso de visitantes."}
            </p>
            <button className="btn-primario col-span-2">
              Proponé el turno
            </button>
          </form>
        </details>
      </div>
    );
  }

  if (t.tipo === "confirmar_turno") {
    return (
      <div className="tarjeta border-verde/40">
        <Cabecera e={e} p={p}>
          <Etiqueta tono="alerta">Confirmá el turno</Etiqueta>
        </Cabecera>
        <DatosTurno e={e} p={p} />
        <div className="flex gap-2">
          <form action={A.confirmarTurno} className="flex-1">
            <Volver a={V} />
            <input type="hidden" name="partidoId" value={p.id} />
            <button className="btn-primario w-full">Confirmá</button>
          </form>
          <form action={A.retirarTurno} className="flex-1">
            <Volver a={V} />
            <input type="hidden" name="partidoId" value={p.id} />
            <button className="btn-secundario w-full">No nos sirve</button>
          </form>
        </div>
      </div>
    );
  }

  if (t.tipo === "jugar") {
    return (
      <div className="tarjeta">
        <Cabecera e={e} p={p}>
          <Etiqueta tono="verde">Programado</Etiqueta>
        </Cabecera>
        <DatosTurno e={e} p={p} />
        <form action={A.retirarTurno}>
          <Volver a={V} />
          <input type="hidden" name="partidoId" value={p.id} />
          <button className="btn-secundario w-full text-xs">
            Retirar turno (recordá cancelar la reserva externa)
          </button>
        </form>
      </div>
    );
  }

  const nombreA = nombreDe(e, p.parejaAId);
  const nombreB = nombreDe(e, p.parejaBId);

  if (t.tipo === "cargar") {
    return (
      <div className="tarjeta border-verde/40">
        <Cabecera e={e} p={p}>
          <Etiqueta tono="alerta">Cargá el resultado</Etiqueta>
        </Cabecera>
        <DatosTurno e={e} p={p} />
        <form action={A.cargarResultado} className="space-y-3">
          <Volver a={V} />
          <input type="hidden" name="partidoId" value={p.id} />
          <CamposMarcador nombreA={nombreA} nombreB={nombreB} />
          <button className="btn-primario w-full">
            Cargá el resultado final
          </button>
        </form>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-suave underline">
            ¿Se terminó el turno sin terminar el partido?
          </summary>
          <form action={A.marcarInconcluso} className="mt-3 space-y-3">
            <Volver a={V} />
            <input type="hidden" name="partidoId" value={p.id} />
            <p className="text-xs text-suave">
              Guardá el marcador como quedó (el último set puede estar en
              juego). No suma puntos hasta completarlo.
            </p>
            <CamposMarcador nombreA={nombreA} nombreB={nombreB} />
            <button className="btn-secundario w-full">
              Guardar como inconcluso
            </button>
          </form>
        </details>
      </div>
    );
  }

  const r = t.r;
  return (
    <div className="tarjeta border-verde/40">
      <Cabecera e={e} p={p}>
        <Etiqueta tono="alerta">
          Validá: {tiempoRestante(r.validarAntes, ahora)}
        </Etiqueta>
      </Cabecera>
      <div className="mb-3 rounded-xl bg-superficie-2 p-3">
        <p className="text-xs text-tenue">
          Resultado cargado por {nombreDe(e, r.cargadoPorParejaId!)}
        </p>
        <p className="text-xl font-bold tabular-nums">
          {resumirMarcador(r.marcador)}
        </p>
        <p className="text-sm text-suave">
          Ganó{" "}
          <span className="font-semibold text-white">
            {nombreDe(e, r.ganadoraId)}
          </span>
          {r.ganadoraId === mia ? " (tu pareja)" : ""}
        </p>
      </div>
      <form action={A.validarResultado} className="space-y-2">
        <Volver a={V} />
        <input type="hidden" name="resultadoId" value={r.id} />
        <button name="respuesta" value="si" className="btn-primario w-full">
          Confirmá: es correcto
        </button>
        <details>
          <summary className="btn-secundario w-full cursor-pointer list-none">
            No coincide
          </summary>
          <label className="mt-2 block">
            <span className="etiqueta">¿Qué no coincide?</span>
            <textarea
              name="motivo"
              rows={2}
              className="campo py-2"
              placeholder="Ej.: el segundo set fue 7–5"
            />
          </label>
          <button
            name="respuesta"
            value="no"
            className="btn-peligro mt-2 w-full"
          >
            Enviar a revisión
          </button>
        </details>
      </form>
      <p className="mt-2 text-xs text-tenue">
        Si no respondés en 48 h, el resultado no se aprueba solo: lo revisa la
        administración.
      </p>
    </div>
  );
}

function DesafioEnviado({
  e,
  d,
  ahora,
}: {
  e: Estado;
  d: Desafio;
  ahora: string;
}) {
  return (
    <div className="tarjeta flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="mb-1 flex gap-2">
          <TipoEtiqueta tipo={d.tipo} />
        </div>
        <p className="text-sm">
          Desafiaste a{" "}
          <span className="font-semibold">{nombreDe(e, d.retadaId)}</span> ·{" "}
          {tiempoRestante(d.responderAntes, ahora)}
        </p>
      </div>
      <form action={A.cancelarDesafio}>
        <Volver a={V} />
        <input type="hidden" name="desafioId" value={d.id} />
        <button className="btn-secundario min-h-9 text-xs">Cancelar</button>
      </form>
    </div>
  );
}

function Esperando({ e, p, texto }: { e: Estado; p: Partido; texto: string }) {
  return (
    <div className="tarjeta">
      <Cabecera e={e} p={p} />
      <DatosTurno e={e} p={p} />
      <p className="text-sm text-suave">{texto}</p>
    </div>
  );
}

const ESTADO_DESAFIO: Record<string, string> = {
  rechazado: "Rechazado",
  vencido_sin_respuesta: "Venció sin respuesta · sin puntos",
  vencido_sin_jugar: "Venció sin jugarse · sin puntos",
  cancelado: "Cancelado",
};

function LineaDesafio({
  e,
  d,
  propia,
}: {
  e: Estado;
  d: Desafio;
  propia: string;
}) {
  const rival = d.retadoraId === propia ? d.retadaId : d.retadoraId;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span>
        {d.retadoraId === propia ? "Desafiaste a" : "Te desafió"}{" "}
        <span className="font-medium">{nombreDe(e, rival)}</span>
      </span>
      <Etiqueta>{ESTADO_DESAFIO[d.estado] ?? d.estado}</Etiqueta>
    </div>
  );
}

function LineaPartido({
  e,
  p,
  r,
  mia,
}: {
  e: Estado;
  p: Partido;
  r?: Resultado;
  mia: string;
}) {
  const rival = p.parejaAId === mia ? p.parejaBId : p.parejaAId;
  const gano = r?.ganadoraId === mia;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p>
          vs <span className="font-medium">{nombreDe(e, rival)}</span>{" "}
          {p.tipo === "amistoso" && (
            <span className="text-xs text-tenue">(amistoso)</span>
          )}
        </p>
        {p.estado === "confirmado" && r && (
          <p className="text-xs text-suave tabular-nums">
            {resumirMarcador(r.marcador)}
            {r.version > 1 ? " · corregido por la administración" : ""}
          </p>
        )}
      </div>
      {p.estado === "confirmado" ? (
        <Etiqueta tono={gano ? "verde" : "neutro"}>
          {gano ? "Ganado" : "Perdido"}
          {p.tipo === "liga" ? (gano ? " · +3" : " · +1") : ""}
        </Etiqueta>
      ) : (
        <Etiqueta>
          {p.estado === "no_disputado"
            ? "No disputado · sin puntos"
            : "Cancelado"}
        </Etiqueta>
      )}
    </div>
  );
}
