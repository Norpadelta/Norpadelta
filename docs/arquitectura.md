# Arquitectura y modelo de datos

## Stack

- **Next.js 15 (App Router) + React 19 + Tailwind 4**, renderizado en servidor y
  Server Actions: una sola app web responsive, sin API separada.
- **Dominio puro en TypeScript** (`src/domain`): todas las reglas y permisos.
  No depende de Next ni de la base, y está cubierto por tests (Vitest).
- **Repositorio:** en la demo, memoria del servidor con escrituras
  transaccionales (`src/data/store.ts`). Para el piloto: **Postgres**
  (`db/schema.sql`, p. ej. Neon o Supabase vía Vercel) con cada acción en una
  transacción `serializable` y las restricciones únicas como última defensa.
- **Autenticación (pendiente):** email con enlace mágico (Auth.js o Supabase
  Auth). Se pide sólo lo necesario; el contacto vive en una tabla separada.
- **Procesos programados:** `procesarVencimientos` cada 5 minutos (Vercel Cron)
  para desafíos, resultados y convocatorias vencidos. En la demo corre al leer.
- **Zona horaria:** fechas en UTC (`timestamptz`), cupos mensuales y presentación
  en `America/Argentina/Buenos_Aires`.

## Por qué así

- Las reglas deportivas en un único lugar, testeadas, evitan que la UI o un
  endpoint las eludan: la UI sólo llama servicios que verifican permisos y reglas.
- El libro de puntos es de sólo agregado: corregir = revertir + nuevo movimiento.
  Así cualquier punto (de liga, copa, barrios o Mundial) es trazable a un
  partido y un resultado, y nunca hay doble asignación.
- Multibarrio desde el modelo: cada liga es una combinación de temporada,
  barrio, categoría y modalidad; ningún valor de Castaños está en el código
  salvo como dato.

## Entidades

| Entidad            | Tabla                                                                       | Notas                                                                                |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Usuarios, roles    | `usuarios`, `usuario_roles`                                                 | jugador, admin_general; delegado (con barrio) y capitán a futuro                     |
| Jugadores          | `jugadores`, `jugador_contacto`, `jugador_modalidades`                      | residencia y categoría validadas por admin                                           |
| Barrios y sedes    | `barrios`                                                                   | datos de sede opcionales ("sin informar")                                            |
| Parejas            | `parejas`, `pareja_integrantes`                                             | una vigente por jugador y modalidad (índice único parcial)                           |
| Temporadas y ligas | `temporadas`, `ligas`                                                       | habilitación manual registrada                                                       |
| Desafíos           | `desafios`                                                                  | tipo liga/amistoso, `mes_cupo`, un pendiente por cruce, un puntuable por rival y mes |
| Partidos y turnos  | `partidos`, `turnos`                                                        | liga, amistoso, copa, mundial; turno vigente único                                   |
| Resultados         | `resultados`                                                                | versiones; un resultado vigente por partido                                          |
| Puntos             | `movimientos_puntos`                                                        | ámbito liga/copa/barrios/mundial; inmutable                                          |
| Cortes             | `cortes_ranking`, `cortes_filas`                                            | copia congelada e inmutable, con base registrada                                     |
| Competencias       | `competencias`                                                              | copas y Mundial; formato cargado cuando se defina                                    |
| Convocatorias      | `convocatorias`, `convocatoria_invitaciones`, `convocatoria_confirmaciones` | una invitación abierta a la vez                                                      |
| Notificaciones     | `notificaciones`                                                            | canal `app` hasta decidir otros                                                      |
| Auditoría          | `acciones_admin`                                                            | inmutable                                                                            |

Equipos o delegaciones de barrio para una copa se derivan de las convocatorias
cubiertas (una por combinación); si hace falta una entidad propia (capitán,
logística) se agrega en la Etapa 2.

## Permisos

`src/domain/permisos.ts`: `exigirAdminGeneral`, `exigirAdminDeBarrio` (admin
general o delegado de ese barrio) y `exigirIntegrante` (sólo integrantes de la
pareja). Un capitán coordina pero no tiene ninguna acción que altere el orden de
convocatoria: no existe en el dominio una operación para elegir pareja a mano.

## Concurrencia y duplicados

- Demo: cada acción se aplica sobre una copia del estado y se guarda sólo si
  termina sin error (Node procesa una a la vez).
- Postgres: transacción por acción + índices únicos parciales
  (`sin_doble_asignacion`, `un_resultado_vigente`, `un_desafio_pendiente_por_cruce`,
  `un_puntuable_por_rival_y_mes`, `una_pareja_vigente_por_modalidad`,
  `una_invitacion_abierta`) y triggers que impiden editar historial.
  Verificado en `tests/schema.test.ts` con PGlite.
