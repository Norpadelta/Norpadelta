import { notificarPareja, type Estado } from "./estado";
import { vencerConvocatorias } from "./convocatorias";
import { avisarAdmins } from "./partidos";
import { vencio } from "./tiempo";

// Proceso periódico (en producción: un cron cada pocos minutos).
// Aplica SÓLO consecuencias aprobadas: nunca adjudica victorias, puntos ni
// sanciones, y nunca aprueba un resultado por falta de respuesta.

export interface ResumenVencimientos {
  desafiosSinRespuesta: number;
  desafiosSinJugar: number;
  resultadosSinValidar: number;
  convocatoriasVencidas: number;
}

export function procesarVencimientos(
  e: Estado,
  ahora: string,
): ResumenVencimientos {
  const resumen: ResumenVencimientos = {
    desafiosSinRespuesta: 0,
    desafiosSinJugar: 0,
    resultadosSinValidar: 0,
    convocatoriasVencidas: 0,
  };

  for (const d of e.desafios) {
    if (d.estado === "pendiente" && vencio(d.responderAntes, ahora)) {
      d.estado = "vencido_sin_respuesta";
      resumen.desafiosSinRespuesta++;
      notificarPareja(
        e,
        d.retadoraId,
        "Tu desafío venció sin respuesta. No suma ni resta puntos.",
        ahora,
        "/mis-partidos",
      );
    }
    if (
      d.estado === "aceptado" &&
      d.jugarAntes &&
      vencio(d.jugarAntes, ahora)
    ) {
      const p = e.partidos.find((x) => x.id === d.partidoId);
      // Si hay un turno confirmado dentro del plazo, el partido se jugó a tiempo: se espera el resultado.
      if (
        p &&
        (p.estado === "por_coordinar" || p.estado === "turno_propuesto")
      ) {
        d.estado = "vencido_sin_jugar";
        p.estado = "no_disputado";
        resumen.desafiosSinJugar++;
        for (const id of [d.retadoraId, d.retadaId])
          notificarPareja(
            e,
            id,
            "El desafío venció sin jugarse. No se asignan puntos ni sanciones.",
            ahora,
            "/mis-partidos",
          );
      }
    }
  }

  for (const r of e.resultados) {
    if (r.estado === "pendiente_validacion" && vencio(r.validarAntes, ahora)) {
      r.estado = "sin_respuesta";
      const p = e.partidos.find((x) => x.id === r.partidoId);
      if (p) p.estado = "en_revision";
      resumen.resultadosSinValidar++;
      avisarAdmins(
        e,
        "Un resultado no fue validado en 48 h y necesita revisión.",
        ahora,
      );
    }
  }

  resumen.convocatoriasVencidas = vencerConvocatorias(e, ahora);
  return resumen;
}
