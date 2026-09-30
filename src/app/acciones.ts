"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ejecutar, reiniciarDemo } from "@/data/store";
import { COOKIE_USUARIO, idUsuarioActual, usuarioDe } from "@/data/sesion";
import * as conv from "@/domain/convocatorias";
import * as des from "@/domain/desafios";
import { ReglaError, type Estado } from "@/domain/estado";
import { cambiarFoto, quitarFoto } from "@/domain/fotos";
import { registrarJugador, validarJugador } from "@/domain/jugadores";
import { habilitarLiga } from "@/domain/ligas";
import * as par from "@/domain/parejas";
import * as pdo from "@/domain/partidos";
import { exigirAdminGeneral } from "@/domain/permisos";
import { crearCorte } from "@/domain/ranking";
import { desdeHoraBA } from "@/domain/tiempo";
import type {
  BaseCorte,
  Categoria,
  EstadoValidacion,
  Marcador,
  Modalidad,
  Usuario,
} from "@/domain/types";

// Cada acción: identifica al usuario en el servidor, ejecuta el servicio del
// dominio (que verifica permisos y reglas) de forma transaccional y vuelve a
// la pantalla con un mensaje de éxito o de error.

function texto(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
}

function numero(fd: FormData, k: string): number | undefined {
  const v = texto(fd, k).trim();
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function destino(fd: FormData): string {
  const v = texto(fd, "volver");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

function conMensaje(ruta: string, m: { ok?: string; error?: string }) {
  const [sinAncla = "/", ancla] = ruta.split("#");
  const [base, query = ""] = sinAncla.split("?");
  const p = new URLSearchParams(query);
  if (m.ok) p.set("ok", m.ok);
  if (m.error) p.set("error", m.error);
  return `${base}?${p}${ancla ? `#${ancla}` : ""}`;
}

async function correr(
  fd: FormData,
  ok: string,
  fn: (e: Estado, ahora: string, u: Usuario | null) => unknown,
) {
  const uid = await idUsuarioActual();
  let m: { ok?: string; error?: string };
  try {
    const r = ejecutar((e, ahora) => fn(e, ahora, usuarioDe(e, uid)));
    m = { ok: typeof r === "string" ? r : ok };
  } catch (err) {
    if (!(err instanceof ReglaError)) throw err;
    m = { error: err.message };
  }
  revalidatePath("/", "layout");
  redirect(conMensaje(destino(fd), m));
}

/** Lee un marcador del formulario. Los campos vacíos se omiten (partidos inconclusos). */
function marcador(fd: FormData): Marcador {
  const sets: Marcador["sets"] = [];
  for (const i of [1, 2]) {
    const a = numero(fd, `s${i}a`);
    const b = numero(fd, `s${i}b`);
    if (a === undefined && b === undefined) continue;
    if (a === undefined || b === undefined)
      throw new ReglaError(
        `Completá los games de las dos parejas en el set ${i}.`,
      );
    const tbA = numero(fd, `s${i}tba`);
    const tbB = numero(fd, `s${i}tbb`);
    sets.push({
      a,
      b,
      ...(tbA !== undefined || tbB !== undefined
        ? { tbA: tbA ?? 0, tbB: tbB ?? 0 }
        : {}),
    });
  }
  const sa = numero(fd, "stba");
  const sb = numero(fd, "stbb");
  return {
    sets,
    ...(sa !== undefined || sb !== undefined
      ? { superTieBreak: { a: sa ?? 0, b: sb ?? 0 } }
      : {}),
  };
}

// ------------------------------------------------------------- Sesión (demo)

export async function ingresar(fd: FormData) {
  const id = texto(fd, "usuarioId");
  (await cookies()).set(COOKIE_USUARIO, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  redirect(texto(fd, "destino") === "admin" ? "/admin" : "/mi-liga");
}

export async function salir() {
  (await cookies()).delete(COOKIE_USUARIO);
  redirect("/");
}

export async function registrarse(fd: FormData) {
  let id: string | null = null;
  let error: string | undefined;
  try {
    id = ejecutar((e, ahora) =>
      registrarJugador(
        e,
        {
          nombre: texto(fd, "nombre"),
          apellido: texto(fd, "apellido"),
          contacto: texto(fd, "contacto"),
          barrioId: texto(fd, "barrioId"),
          categoria: texto(fd, "categoria") as Categoria,
          modalidades: fd.getAll("modalidades").map(String) as Modalidad[],
          foto: texto(fd, "foto"),
        },
        ahora,
      ),
    ).usuarioId;
  } catch (err) {
    if (!(err instanceof ReglaError)) throw err;
    error = err.message;
  }
  if (!id) redirect(conMensaje("/registro", { error }));
  (await cookies()).set(COOKIE_USUARIO, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
  redirect(
    conMensaje("/mi-liga", {
      ok: "Te registraste. La administración va a validar tu residencia y categoría.",
    }),
  );
}

// ------------------------------------------------------------------ Fotos

export async function subirFoto(fd: FormData) {
  await correr(fd, "Tu foto de perfil quedó guardada.", (e, _a, u) => {
    const foto = texto(fd, "foto");
    if (!foto) throw new ReglaError("Elegí una foto primero.");
    cambiarFoto(e, u, foto);
  });
}

export async function quitarMiFoto(fd: FormData) {
  await correr(fd, "Quitaste tu foto de perfil.", (e, ahora, u) =>
    quitarFoto(e, u, u?.jugadorId ?? "", "", ahora),
  );
}

export async function adminQuitarFoto(fd: FormData) {
  await correr(fd, "Foto quitada. Se le avisó al jugador.", (e, ahora, u) =>
    quitarFoto(e, u, texto(fd, "jugadorId"), texto(fd, "motivo"), ahora),
  );
}

export async function marcarLeidas(fd: FormData) {
  await correr(fd, "Avisos marcados como leídos.", (e, _a, u) => {
    for (const n of e.notificaciones) if (n.usuarioId === u?.id) n.leida = true;
  });
}

// ----------------------------------------------------------------- Parejas

export async function invitar(fd: FormData) {
  await correr(
    fd,
    "Invitación enviada. Tu compañero/a tiene que confirmarla.",
    (e, ahora, u) =>
      void par.invitarCompanero(
        e,
        u,
        {
          companeroId: texto(fd, "companeroId"),
          modalidad: texto(fd, "modalidad") as Modalidad,
        },
        ahora,
      ),
  );
}

export async function responderPareja(fd: FormData) {
  const acepta = texto(fd, "respuesta") === "si";
  await correr(
    fd,
    acepta
      ? "Confirmaste la pareja. Falta la aprobación de la administración."
      : "Rechazaste la invitación.",
    (e, ahora, u) =>
      par.responderInvitacion(e, u, texto(fd, "parejaId"), acepta, ahora),
  );
}

export async function disolver(fd: FormData) {
  await correr(
    fd,
    "La pareja quedó disuelta. Sus puntos e historial se conservan.",
    (e, ahora, u) =>
      par.disolverPareja(
        e,
        u,
        texto(fd, "parejaId"),
        texto(fd, "motivo"),
        ahora,
      ),
  );
}

// ---------------------------------------------------------------- Desafíos

export async function desafiar(fd: FormData) {
  await correr(
    fd,
    "¡Desafío enviado! Tienen 48 h para responder.",
    (e, ahora, u) =>
      void des.crearDesafio(
        e,
        u,
        texto(fd, "retadoraId"),
        texto(fd, "retadaId"),
        ahora,
      ),
  );
}

export async function invitarAmistoso(fd: FormData) {
  await correr(
    fd,
    "Invitación a amistoso enviada. No suma puntos.",
    (e, ahora, u) =>
      void des.crearAmistoso(
        e,
        u,
        texto(fd, "retadoraId"),
        texto(fd, "retadaId"),
        ahora,
      ),
  );
}

export async function responderDesafio(fd: FormData) {
  const acepta = texto(fd, "respuesta") === "si";
  await correr(
    fd,
    acepta ? "Aceptaste. Ahora coordinen el turno." : "Rechazaste el desafío.",
    (e, ahora, u) =>
      void des.responderDesafio(e, u, texto(fd, "desafioId"), acepta, ahora),
  );
}

export async function cancelarDesafio(fd: FormData) {
  await correr(fd, "Desafío cancelado.", (e, _a, u) =>
    des.cancelarDesafio(e, u, texto(fd, "desafioId")),
  );
}

// ------------------------------------------------------------------ Turnos

export async function proponerTurno(fd: FormData) {
  await correr(
    fd,
    "Turno propuesto. Falta que lo confirme el rival.",
    (e, ahora, u) => {
      let inicio: string;
      try {
        inicio = desdeHoraBA(texto(fd, "fecha"), texto(fd, "hora"));
      } catch {
        throw new ReglaError("Indicá fecha y hora del turno.");
      }
      pdo.proponerTurno(
        e,
        u,
        texto(fd, "partidoId"),
        {
          inicio,
          barrioSedeId: texto(fd, "barrioSedeId"),
          cancha: texto(fd, "cancha"),
          reservaGestionadaPorId: texto(fd, "gestorId"),
        },
        ahora,
      );
    },
  );
}

export async function confirmarTurno(fd: FormData) {
  await correr(fd, "Turno confirmado. ¡A jugar!", (e, ahora, u) =>
    pdo.confirmarTurno(e, u, texto(fd, "partidoId"), ahora),
  );
}

export async function retirarTurno(fd: FormData) {
  await correr(fd, "Turno retirado.", (e, ahora, u) =>
    pdo.retirarTurno(e, u, texto(fd, "partidoId"), ahora),
  );
}

// -------------------------------------------------------------- Resultados

export async function cargarResultado(fd: FormData) {
  await correr(
    fd,
    "Resultado cargado. El rival tiene 48 h para validarlo.",
    (e, ahora, u) =>
      void pdo.cargarResultado(
        e,
        u,
        texto(fd, "partidoId"),
        marcador(fd),
        ahora,
      ),
  );
}

export async function marcarInconcluso(fd: FormData) {
  await correr(
    fd,
    "Guardamos el marcador. Coordinen otro turno para terminarlo.",
    (e, ahora, u) =>
      pdo.marcarInconcluso(e, u, texto(fd, "partidoId"), marcador(fd), ahora),
  );
}

export async function validarResultado(fd: FormData) {
  const coincide = texto(fd, "respuesta") === "si";
  await correr(
    fd,
    coincide
      ? "Resultado confirmado: ya cuenta para el ranking."
      : "Enviamos tu discrepancia a la administración.",
    (e, ahora, u) =>
      pdo.validarResultado(
        e,
        u,
        texto(fd, "resultadoId"),
        coincide,
        texto(fd, "motivo"),
        ahora,
      ),
  );
}

// ---------------------------------------------------------- Administración

export async function adminValidarJugador(fd: FormData) {
  await correr(fd, "Perfil actualizado.", (e, ahora, u) =>
    validarJugador(
      e,
      u,
      texto(fd, "jugadorId"),
      {
        residencia: texto(fd, "residencia") as EstadoValidacion,
        categoria: texto(fd, "categoria") as Categoria,
        motivo: texto(fd, "motivo"),
      },
      ahora,
    ),
  );
}

export async function adminAprobarPareja(fd: FormData) {
  const aprueba = texto(fd, "respuesta") === "si";
  await correr(
    fd,
    aprueba ? "Pareja aprobada." : "Pareja rechazada.",
    (e, ahora, u) =>
      par.aprobarPareja(
        e,
        u,
        texto(fd, "parejaId"),
        aprueba,
        texto(fd, "motivo"),
        ahora,
      ),
  );
}

export async function adminHabilitarLiga(fd: FormData) {
  const habilitar = texto(fd, "habilitar") === "si";
  await correr(
    fd,
    habilitar ? "Liga habilitada." : "Liga suspendida.",
    (e, ahora, u) =>
      habilitarLiga(
        e,
        u,
        texto(fd, "ligaId"),
        habilitar,
        texto(fd, "motivo"),
        ahora,
      ),
  );
}

export async function adminResolver(fd: FormData) {
  await correr(fd, "Resultado resuelto y puntos asignados.", (e, ahora, u) =>
    pdo.resolverRevision(
      e,
      u,
      texto(fd, "partidoId"),
      marcador(fd),
      texto(fd, "motivo"),
      ahora,
    ),
  );
}

export async function adminNoDisputado(fd: FormData) {
  await correr(
    fd,
    "Partido declarado no disputado. Nadie suma puntos.",
    (e, ahora, u) =>
      pdo.declararNoDisputado(
        e,
        u,
        texto(fd, "partidoId"),
        texto(fd, "motivo"),
        ahora,
      ),
  );
}

export async function adminCorregir(fd: FormData) {
  await correr(
    fd,
    "Resultado corregido: se revirtieron y recalcularon los puntos.",
    (e, ahora, u) =>
      void pdo.corregirResultado(
        e,
        u,
        texto(fd, "partidoId"),
        marcador(fd),
        texto(fd, "motivo"),
        ahora,
      ),
  );
}

export async function adminCrearCorte(fd: FormData) {
  await correr(
    fd,
    "Corte creado. El ranking quedó congelado.",
    (e, ahora, u) => {
      const base = texto(fd, "base") as BaseCorte;
      const desde = texto(fd, "desde");
      void crearCorte(
        e,
        u,
        {
          ligaId: texto(fd, "ligaId"),
          base,
          periodoDesde: desde ? desdeHoraBA(desde, "00:00") : undefined,
          motivo: texto(fd, "motivo"),
        },
        ahora,
      );
    },
  );
}

export async function adminConvocar(fd: FormData) {
  await correr(fd, "Convocatoria simulada iniciada.", (e, ahora, u) => {
    const plazo = numero(fd, "plazoHoras");
    void conv.iniciarConvocatoria(
      e,
      u,
      {
        corteId: texto(fd, "corteId"),
        competencia: {
          tipo: "copa",
          id: "copa-simulada",
          nombre: "Copa simulada (demo)",
        },
        plazoHoras: plazo ?? NaN,
        simulada: true,
      },
      ahora,
    );
  });
}

export async function adminIncompleta(fd: FormData) {
  await correr(
    fd,
    "La plaza pasó a la siguiente pareja del corte.",
    (e, ahora, u) =>
      conv.marcarIncompleta(
        e,
        u,
        texto(fd, "convocatoriaId"),
        texto(fd, "motivo"),
        ahora,
      ),
  );
}

export async function responderConvocatoria(fd: FormData) {
  const acepta = texto(fd, "respuesta") === "si";
  await correr(
    fd,
    acepta
      ? "Confirmaste tu participación."
      : "Avisaste que no pueden. La plaza pasa a la siguiente pareja.",
    (e, ahora, u) =>
      conv.responderConvocatoria(
        e,
        u,
        texto(fd, "convocatoriaId"),
        acepta,
        ahora,
      ),
  );
}

export async function adminReiniciarDemo(fd: FormData) {
  const uid = await idUsuarioActual();
  let error: string | undefined;
  try {
    ejecutar((e) => exigirAdminGeneral(usuarioDe(e, uid)));
  } catch (err) {
    if (!(err instanceof ReglaError)) throw err;
    error = err.message;
  }
  if (!error) reiniciarDemo();
  revalidatePath("/", "layout");
  redirect(
    conMensaje(
      destino(fd),
      error ? { error } : { ok: "La demo volvió a su estado inicial." },
    ),
  );
}
