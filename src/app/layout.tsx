import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { esAdminGeneral } from "@/domain/permisos";
import { Avatar } from "@/ui/avatar";
import { Flash } from "@/ui/flash";
import { Marca } from "@/ui/marca";
import { NavInferior, NavLateral, type ItemNav } from "@/ui/navegacion";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "NORPADELTA", template: "%s · NORPADELTA" },
  description:
    "Ligas de pádel por barrio, copas entre barrios y el Mundial Norpadelta. Nordelta, Buenos Aires.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default async function Layout({ children }: { children: ReactNode }) {
  const uid = await idUsuarioActual();
  const { usuario, foto, esJugador, barrio, sinLeer } = leer((e) => {
    const u = usuarioDe(e, uid);
    const j = u?.jugadorId
      ? e.jugadores.find((x) => x.id === u.jugadorId)
      : undefined;
    return {
      usuario: u,
      foto: j?.foto,
      esJugador: !!j,
      barrio: j
        ? e.barrios.find((b) => b.id === j.barrioId)?.nombre
        : undefined,
      sinLeer: u
        ? e.notificaciones.filter((n) => n.usuarioId === u.id && !n.leida)
            .length
        : 0,
    };
  });

  const principales: ItemNav[] = [
    { href: "/mi-liga", texto: "Mi liga", icono: "liga" },
    { href: "/mis-partidos", texto: "Mis partidos", icono: "partidos" },
    { href: "/parejas", texto: "Parejas", icono: "parejas" },
    { href: "/barrios", texto: "Barrios", icono: "barrios" },
    { href: "/copas", texto: "Copas", icono: "copas" },
    { href: "/ranking-barrios", texto: "Ranking de barrios", icono: "ranking" },
    { href: "/mundial", texto: "Mundial", icono: "mundial" },
    { href: "/reglamento", texto: "Reglamento", icono: "reglamento" },
    ...(esAdminGeneral(usuario)
      ? [{ href: "/admin", texto: "Administración", icono: "admin" as const }]
      : []),
  ];
  const inferiores: ItemNav[] = [
    { href: "/mi-liga", texto: "Mi liga", icono: "liga" },
    { href: "/mis-partidos", texto: "Partidos", icono: "partidos" },
    { href: "/parejas", texto: "Parejas", icono: "parejas" },
    { href: "/copas", texto: "Copas", icono: "copas" },
    { href: "/mas", texto: "Más", icono: "mas" },
  ];

  return (
    <html lang="es-AR" className={GeistSans.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <div className="bg-superficie-2 px-4 py-1.5 text-center text-[11px] text-suave">
          <strong className="text-white">Demo</strong> · datos ficticios ·
          acceso simulado · los cambios se reinician al redesplegar ·{" "}
          <Link
            href="/estado"
            className="underline decoration-verde underline-offset-2 hover:text-white"
          >
            qué es real
          </Link>
        </div>
        <header className="sticky top-0 z-30 border-b border-borde bg-fondo/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <Link href="/" aria-label="NORPADELTA, inicio">
              <Marca />
            </Link>
            {usuario ? (
              <Link
                href={esJugador ? "/perfil" : "/ingresar"}
                aria-label={esJugador ? "Mi perfil" : "Tu cuenta"}
                className="flex items-center gap-2 rounded-full border border-borde py-1 pr-3 pl-1 text-sm hover:border-tenue"
              >
                <Avatar
                  persona={{ nombre: usuario.nombre, foto }}
                  className="ring-0"
                />
                <span className="hidden max-w-40 truncate sm:inline">
                  {usuario.nombre}
                </span>
                {barrio && (
                  <span className="hidden text-suave lg:inline">
                    · {barrio}
                  </span>
                )}
                {sinLeer > 0 && (
                  <span
                    className="rounded-full bg-verde px-1.5 text-[11px] font-bold text-black"
                    aria-label={`${sinLeer} avisos sin leer`}
                  >
                    {sinLeer}
                  </span>
                )}
              </Link>
            ) : (
              <Link href="/ingresar" className="btn-primario min-h-9 px-3">
                Ingresá
              </Link>
            )}
          </div>
        </header>
        <div className="mx-auto flex max-w-6xl gap-8 px-4">
          <NavLateral items={principales} />
          <main className="min-w-0 flex-1 pt-6 pb-28 md:pb-12">
            <Suspense>
              <Flash />
            </Suspense>
            {children}
          </main>
        </div>
        <NavInferior items={inferiores} />
      </body>
    </html>
  );
}
