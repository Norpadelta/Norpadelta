import "server-only";
import { type Estado } from "@/domain/estado";
import { procesarVencimientos } from "@/domain/vencimientos";
import { crearSemilla } from "./semilla";

// Repositorio de la DEMO: el estado vive en la memoria del servidor.
// - No es persistencia real: se reinicia con cada despliegue o reinicio.
// - No es almacenamiento del navegador: todos los usuarios de la demo ven lo mismo.
// - Cada acción corre sobre una copia y sólo se guarda si terminó sin error,
//   igual que una transacción de base de datos.
// La versión real reemplaza este módulo por un repositorio Postgres (db/schema.sql).

const g = globalThis as unknown as { __norpadelta?: Estado };

function estado(): Estado {
  if (!g.__norpadelta) g.__norpadelta = crearSemilla(new Date().toISOString());
  return g.__norpadelta;
}

function ahora() {
  return new Date().toISOString();
}

/** Lectura: antes aplica los vencimientos pendientes (en producción lo hace un cron). */
export function leer<T>(fn: (e: Estado, ahora: string) => T): T {
  const n = ahora();
  const e = estado();
  procesarVencimientos(e, n);
  return fn(e, n);
}

/** Escritura transaccional: si la función lanza un error, no se guarda nada. */
export function ejecutar<T>(fn: (e: Estado, ahora: string) => T): T {
  const n = ahora();
  const copia = structuredClone(estado());
  procesarVencimientos(copia, n);
  const r = fn(copia, n);
  g.__norpadelta = copia;
  return r;
}

export function reiniciarDemo() {
  g.__norpadelta = crearSemilla(ahora());
}
