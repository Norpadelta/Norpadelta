# Decisiones pendientes — propuestas

Nada de este documento está implementado como regla. Cada punto separa **qué
hace hoy la plataforma** (siempre la opción conservadora: no adjudicar, no
sancionar, no inventar) de las **propuestas** con sus efectos. La recomendación
es sólo eso: la decisión es de la organización.

## 1. Desempates del ranking local

**Hoy:** las parejas con los mismos puntos comparten la posición (`1=`). Si el
próximo lugar a convocar está empatado, la convocatoria se bloquea.

| Opción                                                                                                                 | Efecto                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A. Resultado entre ellas (si jugaron entre sí en el período) → más victorias → menos partidos jugados → sorteo público | Premia ganar el duelo directo. Con pocas parejas es frecuente que no se hayan enfrentado. |
| B. Más victorias → diferencia de sets → diferencia de games → sorteo                                                   | Fácil de explicar; usa datos que ya se validan.                                           |
| C. Promedio de puntos por partido                                                                                      | Penaliza a quien jugó más: contradice el objetivo de jugar seguido.                       |

**Recomendación:** A con B como respaldo: 1) duelo directo, 2) victorias, 3) diferencia de sets, 4) diferencia de games, 5) sorteo registrado ante la
administración. Todo sale de resultados confirmados, es automatizable y auditable.

## 2. Base de puntos de cada corte trimestral

**Hoy:** el admin elige explícitamente "anual" o "período desde…" en cada corte
y queda registrado en el corte.

- **Anual acumulado:** premia la constancia; en el último corte las parejas
  nuevas quedan muy lejos.
- **Sólo el período (3 meses):** todas arrancan iguales en cada corte; incentiva
  jugar siempre; una pareja buena que no jugó ese trimestre no clasifica.
- **Mixto:** período + 50 % del anterior.

**Recomendación:** puntos del período para convocar a copas (la tabla anual se
sigue mostrando y define el Mundial). Mantiene la liga viva todo el año.

## 3. Puntaje de copas

Separado del de la liga. Propuesta: puntos por **instancia alcanzada**, iguales
para todas las categorías y modalidades (p. ej. campeón 10, final 7, semifinal 5,
cuartos 3, participación 1). Con formato de zona: 2 por partido ganado en zona.
Cada punto registra pareja, copa, partido y resultado (el libro de movimientos
ya soporta el ámbito `copa`/`barrios`).

## 4. Clasificación general justa entre barrios con distinta cobertura

Problema: un barrio con 9 combinaciones habilitadas suma más que uno con 3.

| Opción                                                                                                        | Efecto                                                                     |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A. Suma simple                                                                                                | Favorece a barrios grandes. Contradice los principios aprobados.           |
| B. Promedio por plaza presentada                                                                              | Justo por rendimiento; un barrio con una sola plaza exitosa puede liderar. |
| C. Suma de las N mejores plazas (N igual para todos, p. ej. 3)                                                | Iguala oportunidades; barrios chicos compiten si tienen N plazas.          |
| D. Clasificaciones separadas por categoría/modalidad + general sólo entre combinaciones que todos presentaron | Muy justo; la general puede quedar casi vacía al principio.                |

**Recomendación:** C, con N fijado antes de la temporada, y publicar también las
tablas por categoría y modalidad (D). Una plaza sin representante suma 0.

## 5. Mínimo de parejas por liga

**Hoy:** habilitación manual del admin (mínimo técnico: 2 parejas).
**Propuesta:** 4 parejas. Con 4 límites mensuales de 4 partidos y "un rival por
mes", con 3 parejas cada una sólo tiene 2 rivales posibles por mes.

## 6. Ascensos y descensos

**Propuesta:** no en el piloto. Al cierre de temporada, el admin revisa categoría
(de oficio o a pedido) con criterios publicados: p. ej. campeón de su liga con
≥ 70 % de victorias puede ascender. Nunca automático durante la temporada.

## 7. Parejas de distintos barrios

**Hoy:** bloqueadas con el mensaje "todavía no reglamentadas".

- **No permitir:** simple, preserva la representación por barrio.
- **Permitir en la liga del barrio de uno de los dos (elegido una vez)**, pero
  sin poder representar a ese barrio en copas.

**Recomendación:** no permitir durante el piloto; reevaluar con datos.

## 8. Desafíos vencidos

**Hoy:** vencido sin respuesta → sin efecto. Aceptado y no jugado en 10 días →
"no disputado", sin puntos ni sanción; el cupo del mes queda usado.

**Propuesta:** sin respuesta en 48 h: nada (se registra). No jugado: si una pareja
propuso ≥ 2 turnos razonables y la otra no aceptó ninguno, la admin puede otorgar
la victoria (3–0 en puntos, marcador simbólico) con motivo registrado; si no, no
disputado y **se libera el cupo** de ambas.

## 9. Extensión para partidos inconclusos

**Hoy:** no vencen solos; aparecen en el panel de administración.
**Propuesta:** 7 días desde el turno inconcluso para completarlo; después, la
admin decide (no disputado o resultado parcial validado por ambas parejas).

## 10. Plazo para aceptar convocatorias

**Hoy:** se fija explícitamente en cada convocatoria.
**Propuesta:** 72 h, con recordatorio a las 24 h. Más corto acelera los
reemplazos; más largo complica armar el cuadro.

## 11. Formato de las copas

Con una pareja por barrio y por combinación, y pocos barrios al principio:
**zona única todos contra todos** si hay ≤ 5 barrios en la combinación; con 6+,
zonas de 3–4 y eliminación directa. Mismo formato de partido que la liga.

## 12. Cupos y clasificación al Mundial

**Propuesta:** los 4 u 8 mejores barrios del ranking acumulado de copas (según
cantidad de barrios adheridos); una plaza por combinación que el barrio tenga
habilitada; mismo mecanismo de convocatoria con corte específico.

## 13. Cancelaciones tardías y ausencias

**Propuesta:** cancelar con < 12 h: advertencia registrada; tercera advertencia
en la temporada: una semana sin poder enviar desafíos. Ausencia sin aviso:
victoria para el rival presente (decisión admin con motivo). Requiere definir
qué pasa con el costo de la reserva donde lo haya.

## 14. Código de conducta y sanciones

Documento breve: respeto, puntualidad, carga honesta de resultados, uso de las
canchas según las reglas del barrio. Escala: advertencia → suspensión temporal →
exclusión, siempre decidida por la administración y registrada.

## 15. Canales de notificación

**Hoy:** sólo avisos dentro de la app. **Propuesta:** email transaccional
(enlace de ingreso + avisos) para el piloto. WhatsApp sólo con WhatsApp Business
API, plantillas aprobadas y consentimiento explícito de cada jugador.

## 16. Reglas operativas de cada sede

Cada barrio completa su ficha (sistema de reservas, canchas, duración, costos,
acceso de visitantes, anticipación). La plataforma ya muestra "Sin informar"
para lo que falta y no extiende las condiciones de Castaños a otros barrios.

## Interpretaciones a confirmar (implementadas de forma conservadora)

- "Desafío pendiente" = sin responder **o** aceptado y todavía sin resultado.
- El cupo mensual se imputa al mes (hora de Buenos Aires) en que se **acepta**
  el desafío, que es cuando queda identificado como oficial.
- Los amistosos no cuentan para los límites de desafíos pendientes.
- Una liga no se puede habilitar con menos de 2 parejas activas.
- El admin puede resolver un resultado en revisión fijando el marcador final, o
  declarar el partido no disputado, siempre con motivo.
- La modalidad mixta no valida el género de los integrantes (no se pide ese dato);
  lo revisa la administración al aprobar la pareja.
