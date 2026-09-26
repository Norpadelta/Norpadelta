import {
  nombrePareja,
  notificar,
  notificarPareja,
  nuevoId,
  obtener,
  ReglaError,
  registrarAccion,
  type Estado,
} from "./estado";
import {
  mismosMarcadores,
  validarMarcadorFinal,
  validarMarcadorParcial,
} from "./marcador";
import { esIntegrante, exigirAdminDeBarrio, jugadorDe } from "./permisos";
import { aplicarPuntos, revertirPuntos } from "./puntos";
import { FORMATO_PARTIDO, REGLAS_RESULTADOS } from "./reglas";
import { esFuturo, sumarHoras, vencio } from "./tiempo";
import type { Marcador, Partido, Resultado, Usuario } from "./types";

function parejaDelActor(e: Estado, actor: Usuario | null, p: Partido): string {
  const j = jugadorDe(e, actor);
  const a = obtener.pareja(e, p.parejaAId);
  const b = obtener.pareja(e, p.parejaBId);
  if (esIntegrante(a, j.id)) return a.id;
  if (esIntegrante(b, j.id)) return b.id;
  throw new ReglaError("Sólo las parejas del partido pueden hacer esto.");
}

function rivalDe(p: Partido, parejaId: string) {
  return p.parejaAId === parejaId ? p.parejaBId : p.parejaAId;
}

function barrioDelPartido(e: Estado, p: Partido) {
  return obtener.pareja(e, p.parejaAId).barrioId;
}

// ---------------------------------------------------------------- Turnos

export interface DatosTurno {
  inicio: string; // ISO UTC
  barrioSedeId: string;
  cancha: string;
  reservaGestionadaPorId: string;
}

/**
 * Registra el turno acordado. Norpadelta NO reserva la cancha: la reserva la
 * gestiona un residente del barrio anfitrión en el sistema de ese barrio.
 */
export function proponerTurno(
  e: Estado,
  actor: Usuario | null,
  partidoId: string,
  t: DatosTurno,
  ahora: string,
) {
  const p = obtener.partido(e, partidoId);
  const propone = parejaDelActor(e, actor, p);
  if (!["por_coordinar", "turno_propuesto", "inconcluso"].includes(p.estado))
    throw new ReglaError(
      "Este partido ya tiene un turno confirmado o terminó.",
    );
  if (!esFuturo(t.inicio, ahora))
    throw new ReglaError("El turno tiene que ser en el futuro.");
  const sede = obtener.barrio(e, t.barrioSedeId);
  if (!t.cancha.trim()) throw new ReglaError("Indicá la cancha.");

  const gestor = obtener.jugador(e, t.reservaGestionadaPorId);
  const integrantes = [
    obtener.pareja(e, p.parejaAId),
    obtener.pareja(e, p.parejaBId),
  ];
  if (!integrantes.some((x) => esIntegrante(x, gestor.id)))
    throw new ReglaError(
      "La reserva la tiene que gestionar alguien que juegue el partido.",
    );
  if (gestor.barrioId !== sede.id)
    throw new ReglaError(
      `La reserva la gestiona un residente de ${sede.nombre}, el barrio anfitrión.`,
    );

  if (p.tipo === "liga") {
    if (sede.id !== barrioDelPartido(e, p))
      throw new ReglaError(
        "Los partidos de liga se juegan en el propio barrio.",
      );
    const d = obtener.desafio(e, p.desafioId);
    // Para partidos inconclusos la extensión del plazo está pendiente de reglamento:
    // no se bloquea el nuevo turno, y la administración ve el caso en su panel.
    if (
      p.estado !== "inconcluso" &&
      d.jugarAntes &&
      vencio(d.jugarAntes, t.inicio)
    )
      throw new ReglaError(
        "El turno tiene que ser dentro de los 10 días del desafío aceptado.",
      );
  }

  p.turno = {
    inicio: t.inicio,
    duracionMin: sede.sede.duracionTurnoMin ?? FORMATO_PARTIDO.duracionTurnoMin,
    barrioSedeId: sede.id,
    cancha: t.cancha.trim(),
    reservaGestionadaPorId: gestor.id,
    sistemaReservas: sede.sede.sistemaReservas,
    propuestoPorParejaId: propone,
    confirmadoPor: [propone],
  };
  p.estado = "turno_propuesto";
  notificarPareja(
    e,
    rivalDe(p, propone),
    "Les propusieron un turno. Confirmalo para que quede programado.",
    ahora,
    "/mis-partidos",
  );
}

export function confirmarTurno(
  e: Estado,
  actor: Usuario | null,
  partidoId: string,
  ahora: string,
) {
  const p = obtener.partido(e, partidoId);
  const quien = parejaDelActor(e, actor, p);
  if (p.estado !== "turno_propuesto" || !p.turno)
    throw new ReglaError("No hay un turno para confirmar.");
  if (p.turno.confirmadoPor.includes(quien))
    throw new ReglaError("Tu pareja ya confirmó este turno; falta el rival.");
  p.turno.confirmadoPor.push(quien);
  p.estado = "programado";
  notificarPareja(
    e,
    rivalDe(p, quien),
    "Turno confirmado. ¡A jugar!",
    ahora,
    "/mis-partidos",
  );
}

/** Retira el turno. No libera la reserva externa: el anfitrión la cancela en su sistema. */
export function retirarTurno(
  e: Estado,
  actor: Usuario | null,
  partidoId: string,
  ahora: string,
): string {
  const p = obtener.partido(e, partidoId);
  const quien = parejaDelActor(e, actor, p);
  if (!p.turno || !["turno_propuesto", "programado"].includes(p.estado))
    throw new ReglaError("No hay turno para retirar.");
  const sistema =
    p.turno.sistemaReservas ?? "el sistema de reservas del barrio";
  p.turno = undefined;
  p.estado = p.marcadorParcial ? "inconcluso" : "por_coordinar";
  notificarPareja(
    e,
    rivalDe(p, quien),
    "El turno se retiró. Coordinen uno nuevo.",
    ahora,
    "/mis-partidos",
  );
  return `Turno retirado. Importante: si había reserva, cancelala también en ${sistema}.`;
}

// ------------------------------------------------------------ Resultados

/** Se terminó el turno sin terminar el partido: se guarda el marcador y no suma. */
export function marcarInconcluso(
  e: Estado,
  actor: Usuario | null,
  partidoId: string,
  parcial: Marcador,
  ahora: string,
) {
  const p = obtener.partido(e, partidoId);
  const quien = parejaDelActor(e, actor, p);
  if (p.estado !== "programado")
    throw new ReglaError("Sólo un partido programado puede quedar inconcluso.");
  if (p.turno && esFuturo(p.turno.inicio, ahora))
    throw new ReglaError("El partido todavía no empezó.");
  const v = validarMarcadorParcial(parcial);
  if (!v.ok) throw new ReglaError(v.error);
  p.marcadorParcial = parcial;
  p.estado = "inconcluso";
  notificarPareja(
    e,
    rivalDe(p, quien),
    "El partido quedó inconcluso. Coordinen otro turno para completarlo.",
    ahora,
    "/mis-partidos",
  );
}

/** Una pareja carga el marcador final. La otra tiene 48 h para validarlo. */
export function cargarResultado(
  e: Estado,
  actor: Usuario | null,
  partidoId: string,
  marcador: Marcador,
  ahora: string,
): Resultado {
  const p = obtener.partido(e, partidoId);
  const quien = parejaDelActor(e, actor, p);
  if (
    p.estado === "resultado_cargado" ||
    p.estado === "en_revision" ||
    p.estado === "confirmado"
  )
    throw new ReglaError("Este partido ya tiene un resultado cargado.");
  if (p.estado !== "programado" || !p.turno)
    throw new ReglaError(
      "Primero tiene que haber un turno confirmado por las dos parejas.",
    );
  if (esFuturo(p.turno.inicio, ahora))
    throw new ReglaError(
      "No se puede cargar el resultado antes del horario del partido.",
    );
  const v = validarMarcadorFinal(marcador);
  if (!v.ok) throw new ReglaError(v.error);

  const version = e.resultados.filter((r) => r.partidoId === p.id).length + 1;
  const r: Resultado = {
    id: nuevoId(e, "res"),
    partidoId: p.id,
    version,
    marcador,
    ganadoraId: v.ganador === "a" ? p.parejaAId : p.parejaBId,
    perdedoraId: v.ganador === "a" ? p.parejaBId : p.parejaAId,
    cargadoPorParejaId: quien,
    cargadoPorUsuarioId: actor!.id,
    cargadoEn: ahora,
    validarAntes: sumarHoras(ahora, REGLAS_RESULTADOS.horasParaValidar),
    estado: "pendiente_validacion",
  };
  e.resultados.push(r);
  p.resultadoVigenteId = r.id;
  p.estado = "resultado_cargado";
  notificarPareja(
    e,
    rivalDe(p, quien),
    `Cargaron el resultado (${v.resumen}). Tienen 48 h para validarlo.`,
    ahora,
    "/mis-partidos",
  );
  return r;
}

function confirmar(
  e: Estado,
  p: Partido,
  r: Resultado,
  usuarioId: string,
  ahora: string,
) {
  r.estado = "confirmado";
  r.validadoPorUsuarioId = usuarioId;
  r.validadoEn = ahora;
  p.resultadoVigenteId = r.id;
  p.estado = "confirmado";
  if (p.desafioId) obtener.desafio(e, p.desafioId).estado = "finalizado";
  aplicarPuntos(e, p, r, usuarioId, ahora);
}

/** La pareja rival confirma o discrepa. Nunca se aprueba por falta de respuesta. */
export function validarResultado(
  e: Estado,
  actor: Usuario | null,
  resultadoId: string,
  coincide: boolean,
  motivo: string,
  ahora: string,
) {
  const r = obtener.resultado(e, resultadoId);
  const p = obtener.partido(e, r.partidoId);
  const quien = parejaDelActor(e, actor, p);
  if (quien === r.cargadoPorParejaId)
    throw new ReglaError("El resultado lo valida la otra pareja.");
  if (r.estado !== "pendiente_validacion")
    throw new ReglaError("Este resultado ya no está esperando validación.");
  if (vencio(r.validarAntes, ahora))
    throw new ReglaError(
      "Venció el plazo de 48 h: ahora lo revisa la administración.",
    );
  if (coincide) {
    confirmar(e, p, r, actor!.id, ahora);
    notificarPareja(
      e,
      rivalDe(p, quien),
      "El resultado quedó confirmado y ya cuenta para el ranking.",
      ahora,
      "/mi-liga",
    );
  } else {
    if (!motivo.trim()) throw new ReglaError("Contanos qué no coincide.");
    r.estado = "discutido";
    r.motivoDiscrepancia = motivo.trim();
    p.estado = "en_revision";
    notificarPareja(
      e,
      rivalDe(p, quien),
      "El rival no está de acuerdo con el resultado. Lo revisa la administración.",
      ahora,
      "/mis-partidos",
    );
    avisarAdmins(
      e,
      `Resultado discutido: ${nombrePareja(e, obtener.pareja(e, p.parejaAId))} vs ${nombrePareja(e, obtener.pareja(e, p.parejaBId))}.`,
      ahora,
    );
  }
}

export function avisarAdmins(e: Estado, texto: string, ahora: string) {
  for (const u of e.usuarios.filter((x) => x.roles.includes("admin_general")))
    notificar(e, u.id, texto, ahora, "/admin");
}

// --------------------------------------------------------- Administración

/**
 * Resuelve un partido en revisión (discutido o sin respuesta). El admin fija
 * el marcador final; si es el mismo que se cargó, se confirma ese resultado.
 */
export function resolverRevision(
  e: Estado,
  actor: Usuario | null,
  partidoId: string,
  marcador: Marcador,
  motivo: string,
  ahora: string,
) {
  const p = obtener.partido(e, partidoId);
  exigirAdminDeBarrio(actor, barrioDelPartido(e, p));
  if (p.estado !== "en_revision")
    throw new ReglaError("El partido no está en revisión.");
  if (!motivo.trim()) throw new ReglaError("Indicá cómo se resolvió.");
  const v = validarMarcadorFinal(marcador);
  if (!v.ok) throw new ReglaError(v.error);
  const cargado = obtener.resultado(e, p.resultadoVigenteId);

  if (mismosMarcadores(cargado.marcador, marcador)) {
    confirmar(e, p, cargado, actor!.id, ahora);
  } else {
    cargado.estado = "rechazado_admin";
    const r: Resultado = {
      id: nuevoId(e, "res"),
      partidoId: p.id,
      version: cargado.version + 1,
      marcador,
      ganadoraId: v.ganador === "a" ? p.parejaAId : p.parejaBId,
      perdedoraId: v.ganador === "a" ? p.parejaBId : p.parejaAId,
      cargadoPorUsuarioId: actor!.id,
      cargadoEn: ahora,
      validarAntes: ahora,
      estado: "pendiente_validacion",
      corrigeA: cargado.id,
      motivoCorreccion: motivo,
    };
    e.resultados.push(r);
    confirmar(e, p, r, actor!.id, ahora);
  }
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: "resolver_revision",
      entidad: "partido",
      entidadId: p.id,
      motivo,
      detalle: v.resumen,
    },
    ahora,
  );
  for (const id of [p.parejaAId, p.parejaBId])
    notificarPareja(
      e,
      id,
      `La administración resolvió el resultado: ${v.resumen}.`,
      ahora,
      "/mis-partidos",
    );
}

/** El admin declara que el partido no se disputó. Nadie suma puntos. */
export function declararNoDisputado(
  e: Estado,
  actor: Usuario | null,
  partidoId: string,
  motivo: string,
  ahora: string,
) {
  const p = obtener.partido(e, partidoId);
  exigirAdminDeBarrio(actor, barrioDelPartido(e, p));
  if (p.estado === "confirmado")
    throw new ReglaError(
      "El partido tiene un resultado confirmado: usá la corrección.",
    );
  if (!motivo.trim()) throw new ReglaError("Indicá el motivo.");
  for (const r of e.resultados.filter(
    (x) => x.partidoId === p.id && x.estado !== "anulado",
  ))
    r.estado = "rechazado_admin";
  p.estado = "no_disputado";
  if (p.desafioId) {
    const d = obtener.desafio(e, p.desafioId);
    if (d.estado === "aceptado") d.estado = "vencido_sin_jugar";
  }
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: "declarar_no_disputado",
      entidad: "partido",
      entidadId: p.id,
      motivo,
    },
    ahora,
  );
}

/**
 * Corrige un resultado YA confirmado: revierte sus puntos, crea una nueva
 * versión confirmada y asigna los puntos correctos. Queda todo registrado.
 */
export function corregirResultado(
  e: Estado,
  actor: Usuario | null,
  partidoId: string,
  marcador: Marcador,
  motivo: string,
  ahora: string,
): Resultado {
  const p = obtener.partido(e, partidoId);
  exigirAdminDeBarrio(actor, barrioDelPartido(e, p));
  if (p.estado !== "confirmado")
    throw new ReglaError("Sólo se corrigen resultados confirmados.");
  if (!motivo.trim())
    throw new ReglaError("Toda corrección necesita un motivo.");
  const v = validarMarcadorFinal(marcador);
  if (!v.ok) throw new ReglaError(v.error);
  const anterior = obtener.resultado(e, p.resultadoVigenteId);
  if (mismosMarcadores(anterior.marcador, marcador))
    throw new ReglaError("El marcador es igual al confirmado.");

  revertirPuntos(e, anterior.id, actor!.id, ahora);
  anterior.estado = "anulado";
  const r: Resultado = {
    id: nuevoId(e, "res"),
    partidoId: p.id,
    version: anterior.version + 1,
    marcador,
    ganadoraId: v.ganador === "a" ? p.parejaAId : p.parejaBId,
    perdedoraId: v.ganador === "a" ? p.parejaBId : p.parejaAId,
    cargadoPorUsuarioId: actor!.id,
    cargadoEn: ahora,
    validarAntes: ahora,
    estado: "pendiente_validacion",
    corrigeA: anterior.id,
    motivoCorreccion: motivo,
  };
  e.resultados.push(r);
  confirmar(e, p, r, actor!.id, ahora);
  registrarAccion(
    e,
    {
      usuarioId: actor!.id,
      accion: "corregir_resultado",
      entidad: "partido",
      entidadId: p.id,
      motivo,
      detalle: `v${anterior.version} → v${r.version}: ${v.resumen}`,
    },
    ahora,
  );
  return r;
}
