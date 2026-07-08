// Campos de formulario compartidos (server-safe, sin estado).

const fieldBase =
  "w-full rounded-md border border-edge bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-violet focus:outline-none";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block space-y-1 text-xs text-muted">{children}</label>;
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`hud-chamfer-sm min-h-11 w-full bg-violet px-4 font-display text-sm font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-50 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

// Formulario plegado tras un botón, para no saturar la pantalla móvil.
export function AddDisclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-dashed border-edge">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-1 px-4 text-sm font-medium text-violet [&::-webkit-details-marker]:hidden">
        <span className="transition-transform group-open:rotate-45">＋</span>
        {label}
      </summary>
      <div className="border-t border-dashed border-edge p-4">{children}</div>
    </details>
  );
}
