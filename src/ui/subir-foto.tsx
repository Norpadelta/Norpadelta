"use client";

import { useRef, useState } from "react";
import { Avatar } from "./avatar";

const LADO = 320; // px: suficiente para un avatar nítido y liviano

/** Recorta al centro en cuadrado y achica la imagen en el navegador. */
async function prepararFoto(archivo: File): Promise<string> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("No pudimos leer esa imagen."));
      i.src = url;
    });
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = LADO;
    canvas.height = LADO;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      (img.naturalWidth - lado) / 2,
      (img.naturalHeight - lado) / 2,
      lado,
      lado,
      0,
      0,
      LADO,
      LADO,
    );
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Selector de foto de perfil. Deja la imagen lista en un campo oculto `foto`
 * del formulario que lo contiene.
 */
export function SubirFoto({
  nombre,
  actual,
}: {
  nombre: string;
  actual?: string;
}) {
  const [foto, setFoto] = useState<string | undefined>(actual);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);
    setCargando(true);
    try {
      setFoto(await prepararFoto(archivo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos leer esa imagen.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar persona={{ nombre: nombre || "?", foto }} tamaño="lg" />
      <div className="space-y-2">
        <input
          type="hidden"
          name="foto"
          value={foto && foto !== actual ? foto : ""}
        />
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => elegir(e.target.files?.[0])}
          aria-label="Elegí una foto de perfil"
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="btn-secundario min-h-9"
          disabled={cargando}
        >
          {cargando ? "Preparando…" : foto ? "Cambiar foto" : "Elegí una foto"}
        </button>
        {foto && foto !== actual && (
          <button
            type="button"
            onClick={() => setFoto(actual)}
            className="block text-xs text-suave underline"
          >
            Descartar
          </button>
        )}
        <p className="text-xs text-tenue">
          Opcional. Sólo la ven los jugadores registrados.
        </p>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    </div>
  );
}
