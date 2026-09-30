// Modelo de dominio de NORPADELTA.
//
// Principios que este modelo hace cumplir por construcción:
// - Todo es multibarrio: ninguna entidad asume Castaños.
// - La unidad competitiva es la PAREJA, no el jugador.
// - Cada liga es una combinación barrio × categoría × modalidad × temporada.
// - Los puntos viven en un libro de movimientos separado por ámbito
//   (liga, copa, barrios, mundial). Nunca se "pisan" totales: se suman
//   movimientos, y las correcciones se hacen con movimientos de reversión.

export type Categoria = "octava" | "septima" | "sexta";
export type Modalidad = "masculino" | "femenino" | "mixto";

export const CATEGORIAS: { id: Categoria; nombre: string; nivel: number }[] = [
  { id: "octava", nombre: "Octava", nivel: 1 },
  { id: "septima", nombre: "Séptima", nivel: 2 },
  { id: "sexta", nombre: "Sexta", nivel: 3 },
];

export const MODALIDADES: { id: Modalidad; nombre: string }[] = [
  { id: "masculino", nombre: "Masculino" },
  { id: "femenino", nombre: "Femenino" },
  { id: "mixto", nombre: "Mixto" },
];

export type Rol = "jugador" | "admin_general" | "delegado" | "capitan";

export type EstadoValidacion = "pendiente" | "validada" | "rechazada";

/** Un dato de sede puede estar confirmado o todavía sin informar. */
export interface InfoSede {
  sistemaReservas?: string;
  canchas?: number;
  duracionTurnoMin?: number;
  condicionesUso?: string;
  accesoVisitantes?: string;
  costos?: string;
}

export interface Barrio {
  id: string;
  slug: string;
  nombre: string;
  /** "piloto": barrio del piloto inicial; "activo": adherido; "en_evaluacion": sin confirmar. */
  estado: "piloto" | "activo" | "en_evaluacion";
  /** true para barrios inventados de la demo. Nunca se muestran como adheridos. */
  ficticio?: boolean;
  sede: InfoSede;
}

export interface Usuario {
  id: string;
  nombre: string;
  roles: Rol[];
  /** Perfil de jugador asociado, si juega. */
  jugadorId?: string;
  /** Rol futuro: barrio que administra un delegado. */
  barrioDelegadoId?: string;
  ficticio?: boolean;
}

export interface Jugador {
  id: string;
  usuarioId: string;
  nombre: string;
  apellido: string;
  /** Dato privado: nunca se expone en rankings ni listados públicos. */
  contacto: string;
  barrioId: string;
  categoria: Categoria;
  modalidades: Modalidad[];
  residencia: EstadoValidacion;
  categoriaValidada: boolean;
  /** Foto de perfil opcional (imagen chica). Sólo la ven usuarios registrados. */
  foto?: string;
  creadoEn: string;
  ficticio?: boolean;
}

export type EstadoPareja =
  | "invitacion" // un jugador invitó, falta la confirmación del otro
  | "pendiente_aprobacion" // ambos confirmaron, falta el administrador
  | "activa"
  | "rechazada" // el invitado rechazó o el admin no la aprobó
  | "disuelta"; // cambio de compañero: se conserva con sus puntos e historial

export interface Pareja {
  id: string;
  jugadorAId: string; // quien invita
  jugadorBId: string; // quien es invitado
  barrioId: string;
  categoria: Categoria;
  modalidad: Modalidad;
  estado: EstadoPareja;
  creadaEn: string;
  confirmadaEn?: string;
  aprobadaEn?: string;
  disueltaEn?: string;
  motivoDisolucion?: string;
}

export interface Temporada {
  id: string;
  anio: number;
  nombre: string;
  /** Fecha real del próximo corte trimestral. null mientras no esté fijada. */
  proximoCorte: string | null;
}

export interface Liga {
  id: string; // `${temporadaId}:${barrioId}:${categoria}:${modalidad}`
  temporadaId: string;
  barrioId: string;
  categoria: Categoria;
  modalidad: Modalidad;
  /**
   * El mínimo de parejas para abrir una liga está pendiente de definición,
   * así que la habilitación es una decisión manual y registrada del admin.
   */
  habilitada: boolean;
}

export type TipoDesafio = "liga" | "amistoso";

export type EstadoDesafio =
  | "pendiente" // esperando respuesta (48 h)
  | "aceptado" // oficial: hay que coordinar y jugar (10 días)
  | "rechazado"
  | "vencido_sin_respuesta"
  | "vencido_sin_jugar" // tratamiento pendiente de reglamento: sin puntos ni sanción
  | "cancelado"
  | "finalizado"; // el partido tiene resultado confirmado

export interface Desafio {
  id: string;
  tipo: TipoDesafio;
  /** Sólo para desafíos de liga. */
  ligaId?: string;
  retadoraId: string;
  retadaId: string;
  estado: EstadoDesafio;
  creadoEn: string;
  responderAntes: string;
  respondidoEn?: string;
  /** Mes (America/Argentina/Buenos_Aires, YYYY-MM) al que se imputa el cupo. */
  mesCupo?: string;
  jugarAntes?: string;
  partidoId?: string;
}

export type TipoPartido = "liga" | "amistoso" | "copa" | "mundial";

export type EstadoPartido =
  | "por_coordinar"
  | "turno_propuesto"
  | "programado"
  | "inconcluso"
  | "resultado_cargado" // esperando validación del rival (48 h)
  | "en_revision" // discrepancia o falta de respuesta: decide el admin
  | "confirmado"
  | "no_disputado"
  | "cancelado";

export interface Turno {
  inicio: string; // ISO UTC
  duracionMin: number;
  barrioSedeId: string;
  cancha: string;
  /** Jugador residente que gestiona la reserva en el sistema externo. */
  reservaGestionadaPorId: string;
  sistemaReservas?: string;
  propuestoPorParejaId: string;
  confirmadoPor: string[]; // ids de pareja
}

export interface Partido {
  id: string;
  tipo: TipoPartido;
  ligaId?: string;
  desafioId?: string;
  parejaAId: string;
  parejaBId: string;
  estado: EstadoPartido;
  turno?: Turno;
  /** Marcador parcial guardado cuando se terminó el turno sin terminar el partido. */
  marcadorParcial?: Marcador;
  resultadoVigenteId?: string;
  creadoEn: string;
}

export interface SetJugado {
  a: number; // games (o puntos, en el súper tie-break) de la pareja A del partido
  b: number;
  /** Puntos del tie-break si el set terminó 7–6. */
  tbA?: number;
  tbB?: number;
}

export interface Marcador {
  sets: SetJugado[]; // 2 sets + súper tie-break opcional como tercer elemento
  superTieBreak?: { a: number; b: number };
}

export type EstadoResultado =
  | "pendiente_validacion"
  | "confirmado"
  | "discutido"
  | "sin_respuesta" // venció el plazo: interviene el admin, nunca se aprueba solo
  | "anulado" // reemplazado por una corrección
  | "rechazado_admin";

export interface Resultado {
  id: string;
  partidoId: string;
  version: number;
  marcador: Marcador;
  ganadoraId: string;
  perdedoraId: string;
  cargadoPorParejaId?: string;
  cargadoPorUsuarioId: string;
  cargadoEn: string;
  validarAntes: string;
  estado: EstadoResultado;
  validadoPorUsuarioId?: string;
  validadoEn?: string;
  motivoDiscrepancia?: string;
  /** Si es una corrección: a qué resultado reemplaza y por qué. */
  corrigeA?: string;
  motivoCorreccion?: string;
}

export type AmbitoPuntos = "liga" | "copa" | "barrios" | "mundial";

export interface MovimientoPuntos {
  id: string;
  ambito: AmbitoPuntos;
  /** ligaId, copaId o mundialId según el ámbito. */
  competenciaId: string;
  parejaId: string;
  barrioId: string;
  puntos: number;
  concepto: "victoria" | "derrota" | "reversion";
  partidoId: string;
  resultadoId: string;
  /** Movimiento original que este movimiento revierte. */
  revierteId?: string;
  /** Fecha en que se jugó el partido: define a qué período corresponde el punto. */
  fechaPartido: string;
  creadoEn: string;
  creadoPorUsuarioId: string;
}

export interface FilaRanking {
  parejaId: string;
  posicion: number;
  /** true si comparte puntos con otra pareja (desempate pendiente). */
  empatada: boolean;
  puntos: number;
  jugados: number;
  ganados: number;
  perdidos: number;
}

/** Base de puntos de un corte. La decisión está pendiente: se elige explícitamente. */
export type BaseCorte = "anual" | "periodo";

export interface CorteRanking {
  id: string;
  ligaId: string;
  creadoEn: string;
  creadoPorUsuarioId: string;
  base: BaseCorte;
  periodoDesde?: string;
  /** Copia congelada: no se recalcula nunca. */
  filas: (FilaRanking & {
    nombrePareja: string;
    estadoParejaAlCorte: EstadoPareja;
  })[];
  motivo: string;
}

export type EstadoInvitacion =
  | "invitada"
  | "aceptada"
  | "rechazada"
  | "vencida"
  | "omitida_incompleta"; // la pareja ya no está completa: pasa a la siguiente

export interface InvitacionConvocatoria {
  parejaId: string;
  posicionEnCorte: number;
  estado: EstadoInvitacion;
  invitadaEn: string;
  confirmarAntes: string;
  confirmaciones: string[]; // jugadorIds que confirmaron
  cerradaEn?: string;
  motivo?: string;
}

export interface Convocatoria {
  id: string;
  /** Competencia para la que se convoca (copa o mundial). */
  competencia: { tipo: "copa" | "mundial"; id: string; nombre: string };
  corteId: string;
  ligaId: string;
  barrioId: string;
  categoria: Categoria;
  modalidad: Modalidad;
  /** Plazo de confirmación: pendiente de reglamento, se fija por convocatoria. */
  plazoHoras: number;
  estado: "en_curso" | "cubierta" | "sin_representante" | "bloqueada_empate";
  invitaciones: InvitacionConvocatoria[];
  simulada?: boolean;
  creadaEn: string;
}

export interface Notificacion {
  id: string;
  usuarioId: string;
  texto: string;
  href?: string;
  creadaEn: string;
  leida: boolean;
}

export interface AccionAdmin {
  id: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  motivo?: string;
  detalle?: string;
  fecha: string;
}
