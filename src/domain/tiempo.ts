import { ZONA_HORARIA } from "./reglas";

// Todas las fechas se guardan en ISO UTC y se interpretan en la zona horaria
// de Buenos Aires para cupos mensuales y para mostrarlas.

const HORA = 60 * 60 * 1000;

export function sumarHoras(iso: string, horas: number): string {
  return new Date(new Date(iso).getTime() + horas * HORA).toISOString();
}

export function sumarDias(iso: string, dias: number): string {
  return sumarHoras(iso, dias * 24);
}

export function esFuturo(iso: string, ahoraIso: string): boolean {
  return new Date(iso).getTime() > new Date(ahoraIso).getTime();
}

export function vencio(
  limiteIso: string | undefined,
  ahoraIso: string,
): boolean {
  return (
    !!limiteIso && new Date(ahoraIso).getTime() > new Date(limiteIso).getTime()
  );
}

function partes(iso: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(
    f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return p as Record<"year" | "month" | "day" | "hour" | "minute", string>;
}

/** Mes calendario en Buenos Aires, formato YYYY-MM. */
export function mesBA(iso: string): string {
  const p = partes(iso);
  return `${p.year}-${p.month}`;
}

/** Fecha calendario en Buenos Aires, formato YYYY-MM-DD. */
export function fechaBA(iso: string): string {
  const p = partes(iso);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Convierte una fecha y hora locales de Buenos Aires (sin DST, UTC−3) a ISO UTC. */
export function desdeHoraBA(fecha: string, hora: string): string {
  const d = new Date(`${fecha}T${hora}:00-03:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Fecha u hora inválida");
  return d.toISOString();
}

export function formatoFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatoFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** "vence en 5 h", "vence en 3 días", "vencido". */
export function tiempoRestante(limiteIso: string, ahoraIso: string): string {
  const ms = new Date(limiteIso).getTime() - new Date(ahoraIso).getTime();
  if (ms <= 0) return "vencido";
  const horas = Math.floor(ms / HORA);
  if (horas < 1) return "vence en menos de 1 h";
  if (horas < 48) return `vence en ${horas} h`;
  return `vence en ${Math.floor(horas / 24)} días`;
}
