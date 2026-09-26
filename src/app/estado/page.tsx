import { Etiqueta, Seccion, Titulo } from "@/ui/kit";

export const metadata = { title: "Qué es real" };

const IMPLEMENTADO = [
  "Reglas de desafíos: mismo barrio, categoría y modalidad; 48 h para responder; 10 días para jugar; 2 pendientes; 4 puntuables por mes; un rival una vez por mes. Se verifican para las dos parejas, al desafiar y al aceptar.",
  "Validación del marcador según el formato aprobado (sets a 6, tie-break a 7, súper tie-break a 10, diferencia de 2) y partidos inconclusos.",
  "Resultados: carga, validación del rival en 48 h, discrepancias y revisión. Nunca se aprueban solos.",
  "Puntos 3/1 en un libro de movimientos: sin duplicados, correcciones con reversión y registro de quién y por qué.",
  "Parejas: invitación, confirmación, aprobación, una por modalidad y cambio de compañero sin transferir puntos.",
  "Cortes congelados y convocatoria por mérito con reemplazos en orden, pareja completa y bloqueo ante empates.",
  "Permisos verificados en el servidor en cada acción (jugador, administración general y delegado de barrio).",
  "Fechas en hora de Buenos Aires. Esquema de base de datos Postgres con restricciones anti-duplicados.",
];

const SIMULADO = [
  "Personas, parejas, partidos y el “Barrio Demo” son ficticios. Castaños es el único barrio real y sólo con la información confirmada.",
  "Acceso: se elige un perfil sin contraseña.",
  "Los datos viven en la memoria del servidor: se comparten entre quienes usan la demo, pero se reinician al redesplegar.",
  "Los vencimientos se procesan al abrir cada pantalla (en producción, un proceso programado).",
  "Las convocatorias a copas se pueden simular desde la administración; no hay copas reales.",
  "Los avisos se ven sólo dentro de la app.",
];

const PENDIENTE = [
  "Autenticación real y base de datos compartida (Postgres) para el piloto.",
  "Canales de notificación (email, WhatsApp u otros): requieren decisión y autorización.",
  "Reglas: desempates, base del corte, puntaje de copas, clasificación general entre barrios, mínimo por liga, ascensos y descensos, parejas de distintos barrios, desafíos vencidos, extensión de inconclusos, plazo de convocatoria, formato de copas, cupos del Mundial, cancelaciones tardías, conducta y sanciones, reglas de cada sede.",
  "Etapas 2 y 3: copas, ranking de barrios y Mundial en funcionamiento.",
];

function Lista({
  items,
  tono,
  etiqueta,
}: {
  items: string[];
  tono: "verde" | "alerta" | "contorno";
  etiqueta: string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li
          key={i}
          className="tarjeta flex flex-col gap-2 text-sm sm:flex-row sm:items-start sm:justify-between"
        >
          <span>{i}</span>
          <Etiqueta tono={tono} className="self-start">
            {etiqueta}
          </Etiqueta>
        </li>
      ))}
    </ul>
  );
}

export default function Estado() {
  return (
    <>
      <Titulo sobre="Transparencia">Qué es real en esta demo</Titulo>
      <Seccion titulo="Implementado y probado">
        <Lista items={IMPLEMENTADO} tono="verde" etiqueta="Real" />
      </Seccion>
      <Seccion titulo="Simulado para la demo">
        <Lista items={SIMULADO} tono="alerta" etiqueta="Simulado" />
      </Seccion>
      <Seccion titulo="Pendiente">
        <Lista items={PENDIENTE} tono="contorno" etiqueta="Pendiente" />
      </Seccion>
    </>
  );
}
