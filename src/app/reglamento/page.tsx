import type { ReactNode } from "react";
import {
  FORMATO_PARTIDO as F,
  REGLAS_LIGA as L,
  REGLAS_RESULTADOS as RR,
} from "@/domain/reglas";
import { Etiqueta, Titulo } from "@/ui/kit";

export const metadata = { title: "Reglamento" };

function Bloque({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-8 scroll-mt-20">
      <h2 className="mb-3 text-lg font-bold">{titulo}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Regla({
  children,
  pendiente,
}: {
  children: ReactNode;
  pendiente?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-borde bg-superficie px-4 py-3 text-sm">
      <div className={pendiente ? "text-suave" : ""}>{children}</div>
      {pendiente ? (
        <Etiqueta tono="contorno">Pendiente</Etiqueta>
      ) : (
        <Etiqueta tono="verde">Aprobado</Etiqueta>
      )}
    </div>
  );
}

export default function Reglamento() {
  return (
    <>
      <Titulo sobre="Versión piloto">Reglamento</Titulo>
      <p className="mb-6 text-sm text-suave">
        Lo marcado como <strong className="text-white">Aprobado</strong> es lo
        que aplica la plataforma. Lo{" "}
        <strong className="text-white">Pendiente</strong> todavía no está
        decidido y la plataforma no lo resuelve por su cuenta.
      </p>

      <nav aria-label="Secciones" className="mb-8 flex flex-wrap gap-2 text-xs">
        {[
          ["circuito", "Circuito"],
          ["parejas", "Parejas"],
          ["liga", "Liga"],
          ["formato", "Formato"],
          ["resultados", "Resultados"],
          ["canchas", "Canchas"],
          ["copas", "Copas y Mundial"],
        ].map(([id, t]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border border-borde px-3 py-1.5 text-suave hover:border-verde hover:text-white"
          >
            {t}
          </a>
        ))}
      </nav>

      <Bloque id="circuito" titulo="Circuito">
        <Regla>
          Tres niveles: liga interna de cada barrio → copas entre barrios →
          Mundial Norpadelta como cierre anual.
        </Regla>
        <Regla>
          Cada combinación de barrio, categoría (Octava, Séptima, Sexta) y
          modalidad (Masculino, Femenino, Mixto) tiene su propia clasificación.
        </Regla>
        <Regla>
          No hay un ranking único de todas las parejas de Nordelta como
          competencia principal.
        </Regla>
        <Regla pendiente>
          Cantidad mínima de parejas para abrir cada liga.
        </Regla>
        <Regla pendiente>Ascensos y descensos entre categorías.</Regla>
      </Bloque>

      <Bloque id="parejas" titulo="Jugadores y parejas">
        <Regla>
          Cada jugador tiene un perfil individual asociado a su barrio. La
          administración valida residencia y categoría.
        </Regla>
        <Regla>
          Un jugador invita a otro y ambos confirman. Una pareja por modalidad:
          se puede jugar, por ejemplo, masculino y mixto.
        </Regla>
        <Regla>
          Cambio de compañero: se crea una pareja nueva. Los puntos quedan en la
          pareja original y no se transfieren.
        </Regla>
        <Regla>
          Los datos de contacto no se muestran en rankings ni listados públicos.
        </Regla>
        <Regla pendiente>
          Parejas integradas por residentes de distintos barrios.
        </Regla>
      </Bloque>

      <Bloque id="liga" titulo="Liga del barrio">
        <Regla>
          Cada pareja elige a quién desafiar. Para sumar: rival del mismo
          barrio, categoría y modalidad.
        </Regla>
        <Regla>
          Hasta {L.horasParaResponderDesafio} h para responder un desafío y
          hasta {L.diasParaJugarDesafio} días para jugarlo después de aceptarlo.
        </Regla>
        <Regla>
          Máximo {L.maxDesafiosAbiertosPorPareja} desafíos pendientes
          simultáneos por pareja, enviados o recibidos.
        </Regla>
        <Regla>
          Hasta {L.maxPartidosPuntuablesPorMes} partidos puntuables por mes y
          por pareja. Un mismo rival otorga puntos una vez por mes. Se verifica
          para las dos parejas.
        </Regla>
        <Regla>
          El partido queda identificado como oficial al aceptar el desafío,
          antes de jugarlo.
        </Regla>
        <Regla>
          Victoria: {L.puntosVictoria} puntos. Derrota disputada:{" "}
          {L.puntosDerrota} punto. Partido inconcluso o resultado discutido: no
          suma hasta resolverse.
        </Regla>
        <Regla>Tabla anual con cortes de clasificación cada tres meses.</Regla>
        <Regla>
          Amistosos entre barrios: se identifican como tales y no suman puntos
          de liga, de copa ni del ranking de barrios.
        </Regla>
        <Regla pendiente>
          Criterio de desempate entre parejas con los mismos puntos. Mientras
          tanto, comparten la posición.
        </Regla>
        <Regla pendiente>
          Si cada corte usa los puntos anuales o los del período.
        </Regla>
        <Regla pendiente>
          Tratamiento de desafíos vencidos y partidos no disputados. Hoy: vencen
          sin puntos ni sanciones y el cupo del mes queda usado.
        </Regla>
        <Regla pendiente>
          Cancelaciones tardías, ausencias, código de conducta y sanciones.
        </Regla>
      </Bloque>

      <Bloque id="formato" titulo="Formato de partido">
        <Regla>
          Turno de {F.duracionTurnoMin} minutos con {F.entradaEnCalorMin} de
          entrada en calor.
        </Regla>
        <Regla>
          Dos sets a {F.gamesPorSet} games. En 6–6, tie-break a {F.tieBreakA}{" "}
          puntos con diferencia de {F.diferenciaMinima}. Punto de oro en 40–40.
        </Regla>
        <Regla>
          Si quedan un set iguales: súper tie-break a {F.superTieBreakA} puntos
          con diferencia de {F.diferenciaMinima}, en lugar del tercer set.
        </Regla>
        <Regla>
          Si se termina el turno: se guarda el marcador, el partido queda
          inconcluso y se coordina otro turno. No suma hasta terminarse y
          validarse.
        </Regla>
        <Regla pendiente>
          Extensión del plazo para completar partidos inconclusos.
        </Regla>
      </Bloque>

      <Bloque id="resultados" titulo="Resultados">
        <Regla>
          Una pareja carga el marcador y la otra tiene {RR.horasParaValidar} h
          para validarlo. Si coincide, queda confirmado.
        </Regla>
        <Regla>
          Si discrepa, pasa a revisión. Si no responde, interviene la
          administración: nunca se aprueba solo.
        </Regla>
        <Regla>
          Sólo los resultados confirmados actualizan la clasificación.
        </Regla>
        <Regla>
          Toda corrección registra quién la hizo y por qué, revierte y recalcula
          los puntos y conserva el historial.
        </Regla>
      </Bloque>

      <Bloque id="canchas" titulo="Canchas y reservas">
        <Regla>
          Norpadelta organiza la competencia y registra los turnos acordados. No
          reserva canchas ni está integrado con los sistemas de los barrios.
        </Regla>
        <Regla>
          Entre barrios: se acuerda la sede, el residente anfitrión reserva, se
          confirman las condiciones de ingreso y ambas parejas confirman el
          turno.
        </Regla>
        <Regla>
          Cancelar en Norpadelta no libera la reserva externa: el anfitrión la
          cancela en el sistema del barrio.
        </Regla>
        <Regla pendiente>
          Anticipación máxima para reservar, costos y reglas de acceso de cada
          barrio.
        </Regla>
      </Bloque>

      <Bloque id="copas" titulo="Copas, ranking de barrios y Mundial">
        <Regla>
          Una pareja por barrio, categoría y modalidad habilitada, convocada por
          orden del ranking local congelado al corte.
        </Regla>
        <Regla>
          Si no puede, rechaza o no confirma a tiempo, se invita a la siguiente.
          Clasifica la pareja completa, sin sustituciones.
        </Regla>
        <Regla>
          El ranking de barrios suma sólo los resultados de las parejas
          representantes en las copas, con trazabilidad.
        </Regla>
        <Regla>
          Al Mundial clasifican barrios por su rendimiento en copas; las parejas
          se convocan por ranking local con el mismo mecanismo.
        </Regla>
        <Regla pendiente>
          Plazo para aceptar convocatorias, formato de las copas y puntaje de
          copas.
        </Regla>
        <Regla pendiente>
          Clasificación general justa entre barrios con distinta cobertura de
          categorías.
        </Regla>
        <Regla pendiente>
          Cupos, formato, fechas, sedes y desempates del Mundial.
        </Regla>
      </Bloque>
    </>
  );
}
