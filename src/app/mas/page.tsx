import { leer } from "@/data/store";
import { idUsuarioActual, usuarioDe } from "@/data/sesion";
import { esAdminGeneral } from "@/domain/permisos";
import { EnlaceTarjeta, Titulo } from "@/ui/kit";

export const metadata = { title: "Más" };

export default async function Mas() {
  const uid = await idUsuarioActual();
  const admin = leer((e) => esAdminGeneral(usuarioDe(e, uid)));
  const items = [
    ["/barrios", "Barrios", "Ligas, canchas y reservas de cada barrio"],
    [
      "/ranking-barrios",
      "Ranking de barrios",
      "Se alimenta con los resultados de las copas",
    ],
    ["/mundial", "Mundial", "El cierre anual del circuito"],
    ["/reglamento", "Reglamento", "Reglas aprobadas y pendientes"],
    ...(admin
      ? [
          [
            "/admin",
            "Administración",
            "Validaciones, resultados, cortes y registro",
          ],
        ]
      : []),
    ["/ingresar", "Tu cuenta", "Avisos y cambio de usuario de la demo"],
    ["/estado", "Qué es real", "Funciones reales, simuladas y pendientes"],
  ];
  return (
    <>
      <Titulo>Más</Titulo>
      <div className="grid gap-2">
        {items.map(([href, t, d]) => (
          <EnlaceTarjeta key={href} href={href!}>
            <p className="font-semibold">{t}</p>
            <p className="text-sm text-suave">{d}</p>
          </EnlaceTarjeta>
        ))}
      </div>
    </>
  );
}
