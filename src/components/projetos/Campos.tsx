import type { ReactNode } from 'react';

export function Campo({ rotulo, children, dica, htmlFor }: { rotulo: string; children: ReactNode; dica?: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-700 mb-1">
        {rotulo}
      </label>
      {children}
      {dica && <p className="text-xs text-neutral-500 mt-1">{dica}</p>}
    </div>
  );
}

export function Marcar({
  checked,
  onChange,
  disabled,
  children,
  dica,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
  dica?: string;
}) {
  return (
    <label className={`flex items-start gap-3 min-h-11 py-1 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-neutral-300 text-vr-600 focus:ring-vr-500"
      />
      <span className="text-sm">
        <span className="font-medium text-neutral-800">{children}</span>
        {dica && <span className="block text-xs text-neutral-500">{dica}</span>}
      </span>
    </label>
  );
}
