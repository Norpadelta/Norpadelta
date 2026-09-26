import Link from "next/link";
import { Vacio } from "@/ui/kit";

export default function NoEncontrado() {
  return (
    <Vacio
      titulo="No encontramos esa página"
      accion={
        <Link href="/" className="btn-primario">
          Volver al inicio
        </Link>
      }
    />
  );
}
