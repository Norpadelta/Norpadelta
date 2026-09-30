import { describe, expect, it } from "vitest";
import { obtener } from "../src/domain/estado";
import {
  cambiarFoto,
  FOTO_MAX_CARACTERES,
  quitarFoto,
} from "../src/domain/fotos";
import { registrarJugador } from "../src/domain/jugadores";
import type { Usuario } from "../src/domain/types";
import { BASE, nuevoCircuito } from "./fixture";

const FOTO =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQg=";

describe("foto de perfil", () => {
  it("es opcional al registrarse y se valida si viene", () => {
    const c = nuevoCircuito();
    const datos = {
      nombre: "Ana",
      apellido: "Paz",
      contacto: "x",
      barrioId: "castanos",
      categoria: "octava" as const,
      modalidades: ["femenino" as const],
    };
    const sin = registrarJugador(c.e, datos, BASE);
    expect(obtener.jugador(c.e, sin.jugadorId).foto).toBeUndefined();
    const con = registrarJugador(c.e, { ...datos, foto: FOTO }, BASE);
    expect(obtener.jugador(c.e, con.jugadorId).foto).toBe(FOTO);
    expect(() =>
      registrarJugador(
        c.e,
        { ...datos, foto: "https://sitio.com/x.jpg" },
        BASE,
      ),
    ).toThrow(/JPG, PNG o WebP/);
  });

  it("sólo acepta imágenes chicas en formatos de imagen", () => {
    const c = nuevoCircuito();
    const a = c.jugador("A");
    expect(() =>
      cambiarFoto(c.e, a.usuario, "data:image/svg+xml;base64,PHN2Zz4="),
    ).toThrow(/JPG, PNG o WebP/);
    expect(() =>
      cambiarFoto(c.e, a.usuario, "data:text/html;base64,PGh0bWw+"),
    ).toThrow(/JPG, PNG o WebP/);
    const pesada = "data:image/jpeg;base64," + "A".repeat(FOTO_MAX_CARACTERES);
    expect(() => cambiarFoto(c.e, a.usuario, pesada)).toThrow(/pesada/);
    cambiarFoto(c.e, a.usuario, FOTO);
    expect(obtener.jugador(c.e, a.jugadorId).foto).toBe(FOTO);
  });

  it("cada jugador cambia sólo la suya; la administración puede quitarla con motivo", () => {
    const c = nuevoCircuito();
    const a = c.jugador("A");
    const b = c.jugador("B");
    cambiarFoto(c.e, a.usuario, FOTO);
    expect(() => quitarFoto(c.e, b.usuario, a.jugadorId, "", BASE)).toThrow(
      /otro jugador/,
    );
    expect(() => quitarFoto(c.e, c.admin, a.jugadorId, "", BASE)).toThrow(
      /por qué/,
    );
    quitarFoto(c.e, c.admin, a.jugadorId, "Imagen inapropiada", BASE);
    expect(obtener.jugador(c.e, a.jugadorId).foto).toBeUndefined();
    expect(c.e.acciones.some((x) => x.accion === "quitar_foto")).toBe(true);
    // El propio jugador puede quitar la suya sin motivo.
    cambiarFoto(c.e, a.usuario, FOTO);
    quitarFoto(c.e, a.usuario, a.jugadorId, "", BASE);
    expect(obtener.jugador(c.e, a.jugadorId).foto).toBeUndefined();
  });

  it("un delegado sólo modera fotos de su barrio", () => {
    const c = nuevoCircuito();
    const a = c.jugador("A");
    cambiarFoto(c.e, a.usuario, FOTO);
    const delegado: Usuario = {
      id: "del",
      nombre: "D",
      roles: ["delegado"],
      barrioDelegadoId: "otro",
    };
    expect(() => quitarFoto(c.e, delegado, a.jugadorId, "x", BASE)).toThrow(
      /otro jugador/,
    );
  });
});
