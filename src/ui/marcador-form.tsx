import type { Marcador } from "@/domain/types";

function Num({
  name,
  def,
  label,
}: {
  name: string;
  def?: number;
  label: string;
}) {
  return (
    <input
      name={name}
      defaultValue={def}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={label}
      className="campo h-11 w-12 px-0 text-center text-base font-bold tabular-nums"
    />
  );
}

/**
 * Campos del marcador en columnas por pareja (A = primera pareja del partido).
 * Tie-break sólo si el set termina 7–6; súper tie-break sólo si quedan 1–1.
 */
export function CamposMarcador({
  nombreA,
  nombreB,
  inicial,
}: {
  nombreA: string;
  nombreB: string;
  inicial?: Marcador;
}) {
  const s = inicial?.sets ?? [];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs text-suave">
        <span />
        <span className="w-12 truncate text-center" title={nombreA}>
          {nombreA.split(" / ")[0]}…
        </span>
        <span className="w-12 truncate text-center" title={nombreB}>
          {nombreB.split(" / ")[0]}…
        </span>
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
        >
          <span className="text-sm font-medium">Set {i}</span>
          <Num
            name={`s${i}a`}
            def={s[i - 1]?.a}
            label={`Set ${i}, games de ${nombreA}`}
          />
          <Num
            name={`s${i}b`}
            def={s[i - 1]?.b}
            label={`Set ${i}, games de ${nombreB}`}
          />
          <span className="text-xs text-tenue">
            Tie-break (sólo si fue 7–6)
          </span>
          <Num
            name={`s${i}tba`}
            def={s[i - 1]?.tbA}
            label={`Tie-break set ${i}, ${nombreA}`}
          />
          <Num
            name={`s${i}tbb`}
            def={s[i - 1]?.tbB}
            label={`Tie-break set ${i}, ${nombreB}`}
          />
        </div>
      ))}
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
        <span className="text-sm font-medium">
          Súper tie-break{" "}
          <span className="block text-xs font-normal text-tenue">
            sólo si quedaron 1–1, a 10
          </span>
        </span>
        <Num
          name="stba"
          def={inicial?.superTieBreak?.a}
          label={`Súper tie-break, ${nombreA}`}
        />
        <Num
          name="stbb"
          def={inicial?.superTieBreak?.b}
          label={`Súper tie-break, ${nombreB}`}
        />
      </div>
    </div>
  );
}
