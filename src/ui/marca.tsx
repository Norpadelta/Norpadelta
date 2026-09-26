import clsx from "clsx";

/** Isotipo: pelota de pádel estilizada en verde pasto. */
export function Isotipo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={clsx("shrink-0", className)}
    >
      <circle cx="16" cy="16" r="15" fill="#35A343" />
      <path
        d="M5 9.5c5.5 1.5 9 6 9 13.5M27 22.5c-5.5-1.5-9-6-9-13.5"
        fill="none"
        stroke="#0A0A0A"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Marca({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <Isotipo className="h-7 w-7" />
      <span className="text-lg font-black tracking-[0.12em]">NORPADELTA</span>
    </span>
  );
}
