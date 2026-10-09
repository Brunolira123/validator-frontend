import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Tela cheia no mobile, painel lateral de 512px a partir de `sm`. */
export function Drawer({ open, onClose, title, children }: Props) {
  // Ref evita re-registrar o listener a cada render (onClose costuma ser arrow inline)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleEsc);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = overflowAnterior;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-white w-full sm:max-w-lg h-full overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 pl-4 pr-2 py-1 sm:pl-6 sm:pr-4 sm:py-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-11 w-11 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
