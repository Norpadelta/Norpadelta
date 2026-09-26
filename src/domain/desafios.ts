import {
  nombrePareja,
  notificarPareja,
  nuevoId,
  obtener,
  ReglaError,
  type Estado,
} from "./estado";
import { ligaDePareja } from "./ligas";
import { exigirIntegrante } from "./permisos";
import { REGLAS_LIGA as R } from "./reglas";
import { mesBA, sumarDias, sumarHoras, vencio } from "./tiempo";
import type { Desafio, Pareja, Partido, Usuario } from "./types";

// Reglas aprobadas de desafíos de liga (ver reglas.ts). Todas se verifican
// para las DOS parejas: recibir un desafío no permite esquivar los límites.
//
// Interpretaciones que conviene confirmar (docs/decisiones-pendientes.md):
// - "Desafío pendiente" = sin responder o aceptado y todavía sin resultado.
// - El cupo mensual se imputa al mes (hora de Buenos Aires) en que se ACEPTA
//   el desafío, que es cuando el partido queda identificado como oficial.
// - Un desafío aceptado que vence sin jugarse sigue ocupando el cupo del mes
//   hasta que el reglamento defina el tratamiento de los vencidos.

const OCUPAN_CUPO: Desafio["estado"][] = [
  "aceptado",
  "finalizado",
  "vencido_sin_jugar",
];

function involucra(d: Desafio, parejaId: string) {
  return d.retadoraId === parejaId || d.retadaId === parejaId;
}

export function cuposDePareja(
  e: Estado,
  parejaId: string,
  ahora: string,
  excluirId?: string,
) {
  const mes = mesBA(ahora);
  const deLiga = e.desafios.filter(
    (d) => d.tipo === "liga" && d.id !== excluirId && involucra(d, parejaId),
  );
  return {
    mes,
    abiertos: deLiga.filter(
      (d) => d.estado === "pendiente" || d.estado === "aceptado",
    ).length,
    puntuablesDelMes: deLiga.filter(
      (d) => d.mesCupo === mes && OCUPAN_CUPO.includes(d.estado),
    ).length,
  };
}

function yaSeEnfrentan(
  e: Estado,
  a: string,
  b: string,
  mes: string,
  excluirId?: string,
) {
  return e.desafios.some(
    (d) =>
      d.tipo === "liga" &&
      d.id !== excluirId &&
      involucra(d, a) &&
      involucra(d, b) &&
      (d.estado === "pendiente" ||
        (d.mesCupo === mes && OCUPAN_CUPO.includes(d.estado))),
  );
}

/**
 * Motivos por los que `retadora` no puede desafiar (o aceptar el desafío de)
 * `retada` en la liga. Lista vacía = elegible.
 */
export function motivosNoElegible(
  e: Estado,
  retadora: Pareja,
  retada: Pareja,
  ahora: string,
  opciones: {
    excluirDesafioId?: string;
    perspectiva?: "retadora" | "retada";
  } = {},
): string[] {
  const { excluirDesafioId, perspectiva = "retadora" } = opciones;
  const m: string[] = [];
  if (retadora.id === retada.id)
    return ["No podés desafiar a tu propia pareja."];
  if (retadora.estado !== "activa" || retada.estado !== "activa")
    return ["Las dos parejas tienen que estar activas."];
  if (retadora.barrioId !== retada.barrioId)
    return [
      "Es de otro barrio: sólo se puede jugar como amistoso, sin puntos de liga.",
    ];
  if (
    retadora.categoria !== retada.categoria ||
    retadora.modalidad !== retada.modalidad
  )
    return [
      "Para sumar puntos el rival tiene que ser de tu misma categoría y modalidad.",
    ];
  const liga = ligaDePareja(e, retadora);
  if (!liga?.habilitada) return ["La liga todavía no está habilitada."];

  const mes = mesBA(ahora);
  const [yo, rival] =
    perspectiva === "retadora" ? [retadora, retada] : [retada, retadora];
  const nombres = [
    [yo, "Tu pareja"],
    [rival, "El rival"],
  ] as const;
  for (const [p, quien] of nombres) {
    const c = cuposDePareja(e, p.id, ahora, excluirDesafioId);
    if (c.abiertos >= R.maxDesafiosAbiertosPorPareja)
      m.push(
        `${quien} ya tiene ${R.maxDesafiosAbiertosPorPareja} desafíos pendientes.`,
      );
    if (c.puntuablesDelMes >= R.maxPartidosPuntuablesPorMes)
      m.push(
        `${quien} ya usó los ${R.maxPartidosPuntuablesPorMes} partidos puntuables del mes.`,
      );
  }
  if (yaSeEnfrentan(e, retadora.id, retada.id, mes, excluirDesafioId))
    m.push(
      "Ya tienen un desafío pendiente o un partido puntuable entre ustedes este mes.",
    );
  return m;
}

export function crearDesafio(
  e: Estado,
  actor: Usuario | null,
  retadoraId: string,
  retadaId: string,
  ahora: string,
): Desafio {
  const retadora = obtener.pareja(e, retadoraId);
  const retada = obtener.pareja(e, retadaId);
  exigirIntegrante(e, actor, retadora);
  const motivos = motivosNoElegible(e, retadora, retada, ahora);
  if (motivos.length) throw new ReglaError(motivos[0]!);
  const d: Desafio = {
    id: nuevoId(e, "des"),
    tipo: "liga",
    ligaId: ligaDePareja(e, retadora)!.id,
    retadoraId,
    retadaId,
    estado: "pendiente",
    creadoEn: ahora,
    responderAntes: sumarHoras(ahora, R.horasParaResponderDesafio),
  };
  e.desafios.push(d);
  notificarPareja(
    e,
    retadaId,
    `${nombrePareja(e, retadora)} los desafió. Tienen ${R.horasParaResponderDesafio} h para responder.`,
    ahora,
    "/mis-partidos",
  );
  return d;
}

/** Amistoso (por ejemplo, entre barrios): no suma puntos en ningún ranking. */
export function crearAmistoso(
  e: Estado,
  actor: Usuario | null,
  retadoraId: string,
  retadaId: string,
  ahora: string,
): Desafio {
  const retadora = obtener.pareja(e, retadoraId);
  const retada = obtener.pareja(e, retadaId);
  exigirIntegrante(e, actor, retadora);
  if (retadora.id === retada.id)
    throw new ReglaError("No podés desafiar a tu propia pareja.");
  if (retadora.estado !== "activa" || retada.estado !== "activa")
    throw new ReglaError("Las dos parejas tienen que estar activas.");
  const repetido = e.desafios.some(
    (d) =>
      d.tipo === "amistoso" &&
      d.estado === "pendiente" &&
      involucra(d, retadoraId) &&
      involucra(d, retadaId),
  );
  if (repetido)
    throw new ReglaError(
      "Ya hay una invitación a amistoso pendiente entre estas parejas.",
    );
  const d: Desafio = {
    id: nuevoId(e, "des"),
    tipo: "amistoso",
    retadoraId,
    retadaId,
    estado: "pendiente",
    creadoEn: ahora,
    responderAntes: sumarHoras(ahora, R.horasParaResponderDesafio),
  };
  e.desafios.push(d);
  notificarPareja(
    e,
    retadaId,
    `${nombrePareja(e, retadora)} los invitó a un amistoso (no suma puntos).`,
    ahora,
    "/mis-partidos",
  );
  return d;
}

export function responderDesafio(
  e: Estado,
  actor: Usuario | null,
  desafioId: string,
  acepta: boolean,
  ahora: string,
): Partido | null {
  const d = obtener.desafio(e, desafioId);
  const retada = obtener.pareja(e, d.retadaId);
  const retadora = obtener.pareja(e, d.retadoraId);
  exigirIntegrante(e, actor, retada);
  if (d.estado !== "pendiente")
    throw new ReglaError("Este desafío ya no está pendiente.");
  if (vencio(d.responderAntes, ahora))
    throw new ReglaError("El plazo para responder ya venció.");
  d.respondidoEn = ahora;
  if (!acepta) {
    d.estado = "rechazado";
    notificarPareja(
      e,
      d.retadoraId,
      `${nombrePareja(e, retada)} rechazó el desafío.`,
      ahora,
      "/mis-partidos",
    );
    return null;
  }
  if (d.tipo === "liga") {
    // Se vuelve a verificar todo al aceptar: pudieron cambiar los cupos de ambas parejas.
    const motivos = motivosNoElegible(e, retadora, retada, ahora, {
      excluirDesafioId: d.id,
      perspectiva: "retada",
    });
    if (motivos.length) throw new ReglaError(motivos[0]!);
    d.mesCupo = mesBA(ahora);
    d.jugarAntes = sumarDias(ahora, R.diasParaJugarDesafio);
  }
  d.estado = "aceptado";
  const partido: Partido = {
    id: nuevoId(e, "pdo"),
    tipo: d.tipo === "liga" ? "liga" : "amistoso",
    ligaId: d.ligaId,
    desafioId: d.id,
    parejaAId: d.retadoraId,
    parejaBId: d.retadaId,
    estado: "por_coordinar",
    creadoEn: ahora,
  };
  e.partidos.push(partido);
  d.partidoId = partido.id;
  notificarPareja(
    e,
    d.retadoraId,
    d.tipo === "liga"
      ? `${nombrePareja(e, retada)} aceptó. Es un partido oficial: coordinen el turno (${R.diasParaJugarDesafio} días).`
      : `${nombrePareja(e, retada)} aceptó el amistoso.`,
    ahora,
    "/mis-partidos",
  );
  return partido;
}

export function cancelarDesafio(
  e: Estado,
  actor: Usuario | null,
  desafioId: string,
) {
  const d = obtener.desafio(e, desafioId);
  exigirIntegrante(e, actor, obtener.pareja(e, d.retadoraId));
  if (d.estado !== "pendiente")
    throw new ReglaError(
      "Sólo se puede cancelar un desafío que todavía no fue respondido.",
    );
  d.estado = "cancelado";
}
