# NORPADELTA

Plataforma de pádel para los barrios de Nordelta: **liga de cada barrio → copas
entre barrios → Mundial Norpadelta**. Web responsive, pensada primero para el
celular.

App independiente dentro de este repositorio (no comparte código ni build con la
tienda de la raíz).

```bash
cd norpadelta
pnpm install
pnpm dev        # http://localhost:3100
pnpm test       # 67 tests: reglas, flujos críticos y esquema Postgres
pnpm typecheck
pnpm build
```

Para recorrer la demo: **Ingresá** → elegí "Tomás Ríos" (tiene un desafío y un
resultado para validar) o "Joaquín (Joaco)" para la administración.

## Estado: real, simulado y pendiente

|                                    |                                                                                                                                                                                                                                               |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Real (implementado y testeado)** | Reglas aprobadas de desafíos, marcador, resultados, puntos 3/1, parejas, cambio de compañero, cortes congelados, convocatoria por mérito, permisos en servidor, hora de Buenos Aires, esquema Postgres con restricciones.                     |
| **Simulado (demo)**                | Personas y partidos ficticios, "Barrio Demo" ficticio, acceso sin contraseña, datos en memoria del servidor (se reinician al redesplegar), vencimientos procesados al abrir pantallas, convocatorias a copa simuladas, avisos sólo en la app. |
| **Pendiente**                      | Autenticación y Postgres en producción, canales de notificación, reglas listadas en `docs/decisiones-pendientes.md`, copas / ranking de barrios / Mundial en funcionamiento.                                                                  |

La misma información está en la pantalla `/estado` de la app.

## Estructura

```
src/domain/     reglas y permisos (TypeScript puro)
  reglas.ts       valores APROBADOS (48 h, 10 días, 2 pendientes, 4 por mes, 3/1…)
  marcador.ts     formato de partido y validación de marcadores
  desafios.ts     elegibilidad (verificada para ambas parejas), cupos, amistosos
  partidos.ts     turnos, resultados, validación, revisión y correcciones
  puntos.ts       libro de puntos con reversiones
  ranking.ts      ranking por liga y cortes congelados
  convocatorias.ts invitación y reemplazo por orden de mérito
  vencimientos.ts proceso periódico (sin adjudicar ni sancionar)
src/data/       repositorio de la demo, semilla ficticia, sesión simulada
src/app/        pantallas y Server Actions
db/schema.sql   esquema Postgres para el piloto
tests/          Vitest (incluye el esquema con PGlite)
docs/           producto, arquitectura y decisiones pendientes
```

## Documentos

- [`docs/producto.md`](docs/producto.md): revisión de la demo anterior, estructura,
  navegación, flujos, diseño y etapas.
- [`docs/arquitectura.md`](docs/arquitectura.md): stack, modelo de datos, permisos,
  concurrencia.
- [`docs/decisiones-pendientes.md`](docs/decisiones-pendientes.md): propuestas con
  sus efectos para cada regla sin definir.

## Despliegue

Proyecto de Vercel separado con **Root Directory = `norpadelta`**. La demo guarda
el estado en memoria de cada instancia; para el piloto hace falta Postgres.
