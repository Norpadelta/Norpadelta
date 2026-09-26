# NORPADELTA — producto

## 1. Revisión de la demo anterior

La demo privada (`norpadelta.alonsolo.chatgpt.site`) no se pudo abrir desde el
entorno de desarrollo (acceso de red bloqueado), así que esta revisión se basa en
la descripción del proyecto. Conviene confirmarla contra la demo.

| Qué                                                    | Se conserva    | Cambia                                                        | Falta                                                                  |
| ------------------------------------------------------ | -------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Paleta negro/blanco/verde `#35A343`                    | ✔             | —                                                             | —                                                                      |
| Parejas, desafíos, resultados y aprobaciones simuladas | ✔ como flujos | Ahora con reglas aprobadas verificadas en servidor            | —                                                                      |
| Ranking general de Nordelta                            | —              | ✘ Se reemplaza por ranking por barrio × categoría × modalidad | —                                                                      |
| Desafíos interbarriales puntuables                     | —              | ✘ Pasan a ser amistosos sin puntos                            | —                                                                      |
| Datos que se reinician al recargar                     | —              | Estado compartido en servidor (demo) → Postgres (piloto)      | Persistencia real                                                      |
| Registro, autenticación, notificaciones                | —              | —                                                             | ✔ Registro y validación (simulados); auth y notificaciones pendientes |
| Copas, ranking de barrios, Mundial                     | —              | —                                                             | Estructura, reglas aprobadas y convocatoria por mérito                 |

## 2. Estructura

```
Liga del barrio (barrio × categoría × modalidad)   ← Etapa 1
      │  corte trimestral congelado
      ▼
Copas entre barrios (1 pareja por barrio y combinación, por mérito)  ← Etapa 2
      │  puntos de copa → ranking de barrios (separado de la liga)
      ▼
Mundial Norpadelta (barrios clasificados por copas; parejas por ranking local)  ← Etapa 3
```

## 3. Navegación

Celular: barra inferior con **Mi liga · Partidos · Parejas · Copas · Más**
(Más → Barrios, Ranking de barrios, Mundial, Reglamento, Administración).
Computadora: barra lateral con todas las secciones. "Administración" sólo
aparece para quien tiene el rol, y además cada acción se verifica en el servidor.

| Pantalla           | Qué resuelve                                                                                                                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mi liga            | Abre la liga del jugador (barrio, categoría, modalidad; pestañas si juega más de una). Posiciones, PJ/PG/Pts, pareja propia resaltada, cupos del mes, desafíos pendientes, próximo corte sólo si hay fecha real, botón **Desafiá** o el motivo por el que no se puede. |
| Mis partidos       | Bandeja "Para hacer": desafíos recibidos, turnos a coordinar o confirmar, resultados a cargar o validar, partidos inconclusos. "Esperando" e historial.                                                                                                                |
| Parejas            | Parejas propias y su estado, invitaciones, formar pareja por modalidad, cambio de compañero con aviso de que los puntos no se transfieren.                                                                                                                             |
| Barrios            | Ficha de cada barrio (reservas, canchas, costos, acceso; "Sin informar" si falta), ligas en juego y en formación, amistosos con otros barrios.                                                                                                                         |
| Copas              | Estado real (sin copas programadas), mecanismo de clasificación, convocatorias con posición en el corte, estado, plazo y siguiente elegible.                                                                                                                           |
| Ranking de barrios | Principios aprobados; vacío hasta la primera copa; trazabilidad por pareja y resultado.                                                                                                                                                                                |
| Mundial            | Criterios aprobados y pendientes; no habilitado.                                                                                                                                                                                                                       |
| Reglamento         | Cada regla marcada **Aprobado** o **Pendiente**.                                                                                                                                                                                                                       |
| Administración     | Validación de perfiles, aprobación de parejas, resultados en revisión, inconclusos, ligas, correcciones, cortes, convocatorias y registro de acciones.                                                                                                                 |

## 4. Flujos

**Jugador:** Registrarse → validar perfil (admin) → invitar compañero/a → confirma
→ aprueba admin → entra a la liga → Desafiá → rival acepta (partido oficial) →
proponen turno (el residente anfitrión reserva en el sistema del barrio) → rival
confirma → juegan → una pareja carga el marcador → la otra valida en 48 h →
suma al ranking.

**Desvíos contemplados:** sin rivales / liga en formación; desafío rechazado,
vencido o cancelado; límite de desafíos o de partidos del mes (se explica el
motivo en cada rival); turno propuesto sin confirmar; turno retirado (recordatorio
de cancelar la reserva externa); partido inconcluso con marcador guardado;
resultado discutido o sin respuesta (revisión admin, nunca aprobación
automática); corrección posterior con reversión de puntos; pareja disuelta;
convocatoria rechazada, vencida, pareja incompleta, empate que bloquea, plaza sin
representante. Cada acción muestra confirmación de éxito o el error en lenguaje
claro.

**Convocatoria a copa:** admin congela el ranking (base elegida explícitamente) →
inicia convocatoria con plazo explícito → se invita al 1.º → confirman los dos
integrantes → plaza cubierta. Si rechaza / vence / falta un integrante → se invita
al siguiente del corte. Sin más parejas → sin representante.

## 5. Diseño

- Fondo `#0A0A0A`, superficies `#141414` / `#1C1C1C`, bordes `#2A2A2A`, grises
  neutros de apoyo; verde `#35A343` sólo en acciones principales, selección y marca.
- Texto **negro** sobre verde (contraste 6,5:1); el blanco sobre verde no alcanza AA.
- Geist Sans, títulos en negrita, etiquetas en mayúsculas pequeñas.
- Tablas de pocas columnas (#, Pareja, PJ, PG, Pts) legibles a 390 px; objetivos
  táctiles de 44 px; barra inferior respetando el área segura.
- Español argentino: "Desafiá", "Confirmá", "Tu pareja", "Tu barrio".
- Web instalable (PWA): se puede sumar un manifest cuando haya uso real; no aporta
  al lanzamiento del piloto.

## 6. Etapas

**Etapa 1 — piloto funcional (Castaños, 3 meses).** Hecho en esta entrega: reglas,
pantallas y pruebas. Falta para el piloto real: autenticación (email con enlace
mágico), repositorio Postgres sobre `db/schema.sql`, proceso programado de
vencimientos cada 5 minutos, avisos por email (a decidir), carga de la ficha de
sede de Castaños y decisión sobre desempates y mínimo por liga.

**Etapa 2 — primera copa.** Ya existe: cortes congelados y convocatoria por mérito
con reemplazos (simulable). Falta: entidad copa con plazas por combinación,
fixture y resultados de copa, puntaje de copas y ranking de barrios con
trazabilidad, tras decidir formato y fórmula.

**Etapa 3 — circuito anual y Mundial.** Varias copas, ranking acumulado de barrios,
cupos y convocatoria al Mundial, competencia final.

**Futuro.** Más barrios y zonas, sponsors, modelo de negocio, app nativa si el uso
lo justifica, integraciones de reservas donde sean posibles. Nada de cobros,
suscripciones ni publicidad está decidido.
