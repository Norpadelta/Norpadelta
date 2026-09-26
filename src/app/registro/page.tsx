import { registrarse } from "@/app/acciones";
import { leer } from "@/data/store";
import { CATEGORIAS, MODALIDADES } from "@/domain/types";
import { Aviso, Titulo } from "@/ui/kit";

export const metadata = { title: "Registrate" };

export default function Registro() {
  const barrios = leer((e) =>
    e.barrios.map((b) => ({
      id: b.id,
      nombre: b.nombre,
      ficticio: b.ficticio,
    })),
  );
  return (
    <>
      <Titulo sobre="Paso 1 de 4">Registrate</Titulo>
      <p className="mb-6 text-sm text-suave">
        Te pedimos sólo lo necesario. Tu contacto lo ve la administración para
        validar tu perfil y no aparece en rankings ni listados.
      </p>
      <form action={registrarse} className="tarjeta grid gap-4 sm:grid-cols-2">
        <label>
          <span className="etiqueta">Nombre</span>
          <input
            name="nombre"
            required
            autoComplete="given-name"
            className="campo"
          />
        </label>
        <label>
          <span className="etiqueta">Apellido</span>
          <input
            name="apellido"
            required
            autoComplete="family-name"
            className="campo"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="etiqueta">Teléfono o email</span>
          <input
            name="contacto"
            required
            className="campo"
            placeholder="Para que la administración te contacte"
          />
        </label>
        <label>
          <span className="etiqueta">Tu barrio</span>
          <select name="barrioId" required className="campo">
            {barrios.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
                {b.ficticio ? " (ficticio)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="etiqueta">Tu categoría</span>
          <select
            name="categoria"
            required
            className="campo"
            defaultValue="septima"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="etiqueta">¿En qué modalidades jugás?</legend>
          <div className="flex flex-wrap gap-2">
            {MODALIDADES.map((m) => (
              <label
                key={m.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-borde px-4 text-sm has-[:checked]:border-verde has-[:checked]:bg-verde-fondo"
              >
                <input
                  type="checkbox"
                  name="modalidades"
                  value={m.id}
                  className="accent-verde"
                />
                {m.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        <Aviso tono="pendiente">
          <p>
            La administración valida tu residencia y tu categoría antes de que
            puedas formar pareja.
          </p>
        </Aviso>
        <button className="btn-primario sm:col-span-2">Registrate</button>
      </form>
    </>
  );
}
