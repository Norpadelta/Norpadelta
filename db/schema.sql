-- NORPADELTA — esquema de base de datos (PostgreSQL 15+)
--
-- Refleja el modelo de src/domain/types.ts. Las reglas deportivas viven en el
-- dominio; la base protege lo que NUNCA puede pasar aunque dos acciones lleguen
-- a la vez: duplicados, doble asignación de puntos, historial alterado.
--
-- Fechas: siempre timestamptz (UTC). Los cupos mensuales se calculan en
-- America/Argentina/Buenos_Aires.

create type categoria as enum ('octava', 'septima', 'sexta');
create type modalidad as enum ('masculino', 'femenino', 'mixto');
create type rol as enum ('jugador', 'admin_general', 'delegado', 'capitan');
create type estado_validacion as enum ('pendiente', 'validada', 'rechazada');

-- ------------------------------------------------------------------ Barrios

create table barrios (
  id text primary key,
  slug text not null unique,
  nombre text not null,
  estado text not null check (estado in ('piloto', 'activo', 'en_evaluacion')),
  -- Cada barrio informa sus condiciones; null = sin informar (no se asume nada).
  sistema_reservas text,
  canchas int check (canchas is null or canchas >= 0),
  duracion_turno_min int check (duracion_turno_min is null or duracion_turno_min > 0),
  condiciones_uso text,
  acceso_visitantes text,
  costos text,
  creado_en timestamptz not null default now()
);

-- ------------------------------------------------------- Usuarios y jugadores

create table usuarios (
  id text primary key,
  -- Identidad del proveedor de autenticación (email con enlace mágico, etc.).
  auth_subject text unique,
  nombre text not null,
  creado_en timestamptz not null default now()
);

create table usuario_roles (
  id bigint generated always as identity primary key,
  usuario_id text not null references usuarios (id),
  rol rol not null,
  -- Sólo para delegados (rol futuro): el barrio que administran.
  barrio_id text references barrios (id),
  check ((rol = 'delegado') = (barrio_id is not null))
);
create unique index un_rol_por_usuario on usuario_roles (usuario_id, rol, coalesce(barrio_id, ''));

create table jugadores (
  id text primary key,
  usuario_id text not null unique references usuarios (id),
  nombre text not null,
  apellido text not null,
  barrio_id text not null references barrios (id),
  categoria categoria not null,
  residencia estado_validacion not null default 'pendiente',
  categoria_validada boolean not null default false,
  foto_url text, -- opcional; sólo visible para usuarios registrados
  creado_en timestamptz not null default now()
);

-- Datos de contacto separados: nunca se unen en consultas públicas (rankings).
create table jugador_contacto (
  jugador_id text primary key references jugadores (id),
  contacto text not null
);

create table jugador_modalidades (
  jugador_id text not null references jugadores (id),
  modalidad modalidad not null,
  primary key (jugador_id, modalidad)
);

-- ----------------------------------------------------------------- Parejas

create table parejas (
  id text primary key,
  jugador_a_id text not null references jugadores (id),
  jugador_b_id text not null references jugadores (id),
  barrio_id text not null references barrios (id),
  categoria categoria not null,
  modalidad modalidad not null,
  estado text not null check (estado in ('invitacion', 'pendiente_aprobacion', 'activa', 'rechazada', 'disuelta')),
  creada_en timestamptz not null default now(),
  confirmada_en timestamptz,
  aprobada_en timestamptz,
  disuelta_en timestamptz,
  motivo_disolucion text,
  check (jugador_a_id <> jugador_b_id)
);

-- Integrantes denormalizados para garantizar "una pareja vigente por modalidad".
create table pareja_integrantes (
  pareja_id text not null references parejas (id),
  jugador_id text not null references jugadores (id),
  modalidad modalidad not null,
  vigente boolean not null,
  primary key (pareja_id, jugador_id)
);
create unique index una_pareja_vigente_por_modalidad on pareja_integrantes (jugador_id, modalidad) where vigente;

-- ------------------------------------------------------- Temporadas y ligas

create table temporadas (
  id text primary key,
  anio int not null,
  nombre text not null,
  proximo_corte timestamptz, -- null mientras no haya fecha real
  actual boolean not null default false
);
create unique index una_temporada_actual on temporadas (actual) where actual;

create table ligas (
  id text primary key,
  temporada_id text not null references temporadas (id),
  barrio_id text not null references barrios (id),
  categoria categoria not null,
  modalidad modalidad not null,
  habilitada boolean not null default false,
  unique (temporada_id, barrio_id, categoria, modalidad)
);

-- --------------------------------------------------- Competencias por barrio

create table competencias (
  id text primary key,
  tipo text not null check (tipo in ('copa', 'mundial')),
  temporada_id text not null references temporadas (id),
  nombre text not null,
  estado text not null check (estado in ('borrador', 'convocatoria', 'en_juego', 'finalizada')),
  -- Formato, fechas y sedes pendientes de definición: se cargan cuando existan.
  formato jsonb,
  creada_en timestamptz not null default now()
);

-- ------------------------------------------------------ Desafíos y partidos

create table desafios (
  id text primary key,
  tipo text not null check (tipo in ('liga', 'amistoso')),
  liga_id text references ligas (id),
  retadora_id text not null references parejas (id),
  retada_id text not null references parejas (id),
  estado text not null check (
    estado in ('pendiente', 'aceptado', 'rechazado', 'vencido_sin_respuesta', 'vencido_sin_jugar', 'cancelado', 'finalizado')
  ),
  creado_en timestamptz not null default now(),
  responder_antes timestamptz not null,
  respondido_en timestamptz,
  mes_cupo char(7), -- YYYY-MM en hora de Buenos Aires
  jugar_antes timestamptz,
  check (retadora_id <> retada_id),
  check ((tipo = 'liga') = (liga_id is not null))
);
-- Un solo desafío pendiente entre las mismas dos parejas, en cualquier sentido.
create unique index un_desafio_pendiente_por_cruce
  on desafios (tipo, least(retadora_id, retada_id), greatest(retadora_id, retada_id))
  where estado = 'pendiente';
-- Un mismo rival otorga puntos una vez por mes.
create unique index un_puntuable_por_rival_y_mes
  on desafios (least(retadora_id, retada_id), greatest(retadora_id, retada_id), mes_cupo)
  where tipo = 'liga' and estado in ('aceptado', 'finalizado', 'vencido_sin_jugar');

create table partidos (
  id text primary key,
  tipo text not null check (tipo in ('liga', 'amistoso', 'copa', 'mundial')),
  liga_id text references ligas (id),
  competencia_id text references competencias (id),
  desafio_id text unique references desafios (id),
  pareja_a_id text not null references parejas (id),
  pareja_b_id text not null references parejas (id),
  estado text not null check (
    estado in ('por_coordinar', 'turno_propuesto', 'programado', 'inconcluso', 'resultado_cargado', 'en_revision', 'confirmado', 'no_disputado', 'cancelado')
  ),
  marcador_parcial jsonb,
  creado_en timestamptz not null default now(),
  check (pareja_a_id <> pareja_b_id),
  check ((tipo = 'liga') = (liga_id is not null)),
  check ((tipo in ('copa', 'mundial')) = (competencia_id is not null))
);

-- Turnos acordados. Norpadelta NO reserva: registra lo que el anfitrión reservó.
create table turnos (
  id text primary key,
  partido_id text not null references partidos (id),
  inicio timestamptz not null,
  duracion_min int not null,
  barrio_sede_id text not null references barrios (id),
  cancha text not null,
  reserva_gestionada_por_id text not null references jugadores (id),
  sistema_reservas text,
  propuesto_por_pareja_id text not null references parejas (id),
  confirmado_por_rival_en timestamptz,
  retirado_en timestamptz
);
create unique index un_turno_vigente_por_partido on turnos (partido_id) where retirado_en is null;

-- ------------------------------------------------------------- Resultados

create table resultados (
  id text primary key,
  partido_id text not null references partidos (id),
  version int not null,
  marcador jsonb not null,
  ganadora_id text not null references parejas (id),
  perdedora_id text not null references parejas (id),
  cargado_por_pareja_id text references parejas (id),
  cargado_por_usuario_id text not null references usuarios (id),
  cargado_en timestamptz not null default now(),
  validar_antes timestamptz not null,
  estado text not null check (
    estado in ('pendiente_validacion', 'confirmado', 'discutido', 'sin_respuesta', 'anulado', 'rechazado_admin')
  ),
  validado_por_usuario_id text references usuarios (id),
  validado_en timestamptz,
  motivo_discrepancia text,
  corrige_a text references resultados (id),
  motivo_correccion text,
  unique (partido_id, version),
  check (ganadora_id <> perdedora_id),
  check (corrige_a is null or motivo_correccion is not null)
);
-- Un único resultado vigente por partido: evita cargas duplicadas simultáneas.
create unique index un_resultado_vigente
  on resultados (partido_id)
  where estado in ('pendiente_validacion', 'confirmado', 'discutido', 'sin_respuesta');

-- ------------------------------------------------------- Libro de puntos

create table movimientos_puntos (
  id text primary key,
  ambito text not null check (ambito in ('liga', 'copa', 'barrios', 'mundial')),
  competencia_id text not null, -- liga, copa o mundial según el ámbito
  pareja_id text not null references parejas (id),
  barrio_id text not null references barrios (id),
  puntos int not null,
  concepto text not null check (concepto in ('victoria', 'derrota', 'reversion')),
  partido_id text not null references partidos (id),
  resultado_id text not null references resultados (id),
  revierte_id text unique references movimientos_puntos (id),
  fecha_partido timestamptz not null,
  creado_en timestamptz not null default now(),
  creado_por_usuario_id text not null references usuarios (id),
  check ((concepto = 'reversion') = (revierte_id is not null))
);
-- Un resultado asigna puntos una sola vez a cada pareja en cada ámbito.
create unique index sin_doble_asignacion
  on movimientos_puntos (resultado_id, pareja_id, ambito)
  where concepto <> 'reversion';
create index movimientos_por_competencia on movimientos_puntos (ambito, competencia_id, pareja_id);

-- ---------------------------------------------- Cortes (ranking congelado)

create table cortes_ranking (
  id text primary key,
  liga_id text not null references ligas (id),
  base text not null check (base in ('anual', 'periodo')),
  periodo_desde timestamptz,
  motivo text not null,
  creado_en timestamptz not null default now(),
  creado_por_usuario_id text not null references usuarios (id),
  check ((base = 'periodo') = (periodo_desde is not null))
);

create table cortes_filas (
  corte_id text not null references cortes_ranking (id),
  pareja_id text not null references parejas (id),
  nombre_pareja text not null,
  estado_pareja_al_corte text not null,
  posicion int not null,
  empatada boolean not null,
  puntos int not null,
  jugados int not null,
  ganados int not null,
  perdidos int not null,
  primary key (corte_id, pareja_id)
);

-- ------------------------------------------------------- Convocatorias

create table convocatorias (
  id text primary key,
  competencia_id text not null references competencias (id),
  corte_id text not null references cortes_ranking (id),
  liga_id text not null references ligas (id),
  plazo_horas int not null check (plazo_horas > 0),
  estado text not null check (estado in ('en_curso', 'cubierta', 'sin_representante', 'bloqueada_empate')),
  simulada boolean not null default false,
  creada_en timestamptz not null default now()
);
create unique index una_convocatoria_por_plaza on convocatorias (competencia_id, liga_id) where estado <> 'sin_representante';

create table convocatoria_invitaciones (
  convocatoria_id text not null references convocatorias (id),
  pareja_id text not null references parejas (id),
  posicion_en_corte int not null,
  estado text not null check (estado in ('invitada', 'aceptada', 'rechazada', 'vencida', 'omitida_incompleta')),
  invitada_en timestamptz not null,
  confirmar_antes timestamptz not null,
  cerrada_en timestamptz,
  motivo text,
  primary key (convocatoria_id, pareja_id)
);
create unique index una_invitacion_abierta on convocatoria_invitaciones (convocatoria_id) where estado = 'invitada';

create table convocatoria_confirmaciones (
  convocatoria_id text not null,
  pareja_id text not null,
  jugador_id text not null references jugadores (id),
  confirmado_en timestamptz not null default now(),
  primary key (convocatoria_id, pareja_id, jugador_id),
  foreign key (convocatoria_id, pareja_id) references convocatoria_invitaciones (convocatoria_id, pareja_id)
);

-- --------------------------------------------- Notificaciones y auditoría

create table notificaciones (
  id text primary key,
  usuario_id text not null references usuarios (id),
  texto text not null,
  href text,
  -- Canal: por ahora sólo dentro de la app. Otros canales requieren autorización.
  canal text not null default 'app' check (canal in ('app')),
  creada_en timestamptz not null default now(),
  leida boolean not null default false
);

create table acciones_admin (
  id text primary key,
  usuario_id text not null references usuarios (id),
  accion text not null,
  entidad text not null,
  entidad_id text not null,
  motivo text,
  detalle text,
  fecha timestamptz not null default now()
);

-- ------------------------------------------ Historial que no se reescribe

create function prohibir_cambios() returns trigger language plpgsql as $$
begin
  raise exception 'La tabla % es de sólo agregado: registrá una reversión o una nueva versión.', tg_table_name;
end;
$$;

create trigger movimientos_inmutables before update or delete on movimientos_puntos
  for each row execute function prohibir_cambios();
create trigger cortes_inmutables before update or delete on cortes_ranking
  for each row execute function prohibir_cambios();
create trigger cortes_filas_inmutables before update or delete on cortes_filas
  for each row execute function prohibir_cambios();
create trigger acciones_inmutables before update or delete on acciones_admin
  for each row execute function prohibir_cambios();

-- Vista pública del ranking de liga: sin datos de contacto.
create view ranking_liga as
select
  m.competencia_id as liga_id,
  m.pareja_id,
  sum(m.puntos) as puntos
from movimientos_puntos m
where m.ambito = 'liga'
group by m.competencia_id, m.pareja_id;
