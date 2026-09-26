import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// Verifica que db/schema.sql es Postgres válido y que las restricciones que
// protegen la competencia funcionan aunque la app tenga un error o dos
// acciones lleguen al mismo tiempo.

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8"),
  );
  await db.exec(`
    insert into barrios (id, slug, nombre, estado, sistema_reservas, canchas, duracion_turno_min)
      values ('castanos', 'castanos', 'Castaños', 'piloto', 'Basapp', 2, 90);
    insert into usuarios (id, nombre) values ('u1','A1'),('u2','A2'),('u3','B1'),('u4','B2'),('adm','Admin');
    insert into jugadores (id, usuario_id, nombre, apellido, barrio_id, categoria)
      values ('j1','u1','A','1','castanos','septima'),('j2','u2','A','2','castanos','septima'),
             ('j3','u3','B','1','castanos','septima'),('j4','u4','B','2','castanos','septima');
    insert into parejas (id, jugador_a_id, jugador_b_id, barrio_id, categoria, modalidad, estado)
      values ('pa','j1','j2','castanos','septima','masculino','activa'),('pb','j3','j4','castanos','septima','masculino','activa');
    insert into pareja_integrantes values ('pa','j1','masculino',true),('pa','j2','masculino',true),
                                          ('pb','j3','masculino',true),('pb','j4','masculino',true);
    insert into temporadas (id, anio, nombre, actual) values ('t26', 2026, 'Temporada 2026', true);
    insert into ligas (id, temporada_id, barrio_id, categoria, modalidad, habilitada)
      values ('l1','t26','castanos','septima','masculino',true);
    insert into desafios (id, tipo, liga_id, retadora_id, retada_id, estado, responder_antes, mes_cupo)
      values ('d1','liga','l1','pa','pb','finalizado', now(), '2026-10');
    insert into partidos (id, tipo, liga_id, desafio_id, pareja_a_id, pareja_b_id, estado)
      values ('p1','liga','l1','d1','pa','pb','confirmado');
    insert into resultados (id, partido_id, version, marcador, ganadora_id, perdedora_id, cargado_por_usuario_id, validar_antes, estado)
      values ('r1','p1',1,'{"sets":[{"a":6,"b":3},{"a":6,"b":4}]}','pa','pb','u1', now(), 'confirmado');
    insert into movimientos_puntos (id, ambito, competencia_id, pareja_id, barrio_id, puntos, concepto, partido_id, resultado_id, fecha_partido, creado_por_usuario_id)
      values ('m1','liga','l1','pa','castanos',3,'victoria','p1','r1', now(), 'u3'),
             ('m2','liga','l1','pb','castanos',1,'derrota','p1','r1', now(), 'u3');
  `);
});

const falla = (sql: string) => expect(db.exec(sql)).rejects.toThrow();

describe("db/schema.sql", () => {
  it("impide asignar dos veces los puntos de un resultado", async () => {
    await falla(`insert into movimientos_puntos (id, ambito, competencia_id, pareja_id, barrio_id, puntos, concepto, partido_id, resultado_id, fecha_partido, creado_por_usuario_id)
      values ('m3','liga','l1','pa','castanos',3,'victoria','p1','r1', now(), 'u3')`);
  });

  it("el libro de puntos es de sólo agregado; se corrige con reversiones", async () => {
    await falla(`update movimientos_puntos set puntos = 30 where id = 'm1'`);
    await falla(`delete from movimientos_puntos where id = 'm1'`);
    await db.exec(`insert into movimientos_puntos (id, ambito, competencia_id, pareja_id, barrio_id, puntos, concepto, partido_id, resultado_id, revierte_id, fecha_partido, creado_por_usuario_id)
      values ('m1r','liga','l1','pa','castanos',-3,'reversion','p1','r1','m1', now(), 'adm')`);
    // No se puede revertir dos veces el mismo movimiento.
    await falla(`insert into movimientos_puntos (id, ambito, competencia_id, pareja_id, barrio_id, puntos, concepto, partido_id, resultado_id, revierte_id, fecha_partido, creado_por_usuario_id)
      values ('m1r2','liga','l1','pa','castanos',-3,'reversion','p1','r1','m1', now(), 'adm')`);
    const { rows } = await db.query<{ puntos: number }>(
      `select puntos::int from ranking_liga where pareja_id = 'pa'`,
    );
    expect(rows[0]!.puntos).toBe(0);
  });

  it("un único resultado vigente por partido", async () => {
    await falla(`insert into resultados (id, partido_id, version, marcador, ganadora_id, perdedora_id, cargado_por_usuario_id, validar_antes, estado)
      values ('r2','p1',2,'{}','pb','pa','u3', now(), 'pendiente_validacion')`);
  });

  it("un rival otorga puntos una vez por mes y no hay desafíos pendientes duplicados", async () => {
    await falla(`insert into desafios (id, tipo, liga_id, retadora_id, retada_id, estado, responder_antes, mes_cupo)
      values ('d2','liga','l1','pb','pa','aceptado', now(), '2026-10')`);
    await db.exec(`insert into desafios (id, tipo, liga_id, retadora_id, retada_id, estado, responder_antes)
      values ('d3','liga','l1','pb','pa','pendiente', now())`);
    await falla(`insert into desafios (id, tipo, liga_id, retadora_id, retada_id, estado, responder_antes)
      values ('d4','liga','l1','pa','pb','pendiente', now())`);
  });

  it("una pareja vigente por jugador y modalidad", async () => {
    await db.exec(`insert into parejas (id, jugador_a_id, jugador_b_id, barrio_id, categoria, modalidad, estado)
      values ('pc','j1','j3','castanos','septima','masculino','invitacion')`);
    await falla(
      `insert into pareja_integrantes values ('pc','j1','masculino',true)`,
    );
  });

  it("un corte congelado no se puede modificar", async () => {
    await db.exec(`insert into cortes_ranking (id, liga_id, base, motivo, creado_por_usuario_id) values ('c1','l1','anual','Copa','adm');
      insert into cortes_filas values ('c1','pa','A1 / A2','activa',1,false,3,1,1,0);`);
    await falla(`update cortes_filas set posicion = 2 where corte_id = 'c1'`);
    await falla(
      `insert into cortes_ranking (id, liga_id, base, motivo, creado_por_usuario_id) values ('c2','l1','periodo','x','adm')`,
    );
  });
});
