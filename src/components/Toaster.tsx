import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';

/** Acima dos modais (z-60), no rodapé e centralizado no celular, no canto no desktop. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const fechar = useToastStore((s) => s.fechar);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl bg-neutral-900 py-3 pl-4 pr-2 text-sm text-white shadow-2xl motion-safe:animate-slide-up"
        >
          {t.tipo === 'sucesso' ? (
            <CheckCircle2 size={18} className="mt-px shrink-0 text-green-400" aria-hidden="true" />
          ) : (
            <AlertCircle size={18} className="mt-px shrink-0 text-red-400" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1 break-words">{t.mensagem}</p>
          <button
            type="button"
            onClick={() => fechar(t.id)}
            aria-label="Fechar aviso"
            className="-my-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
