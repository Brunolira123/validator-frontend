import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  size?: 'lg' | '2xl';
  children: ReactNode;
}

const sizes = {
  lg: 'sm:max-w-lg',
  '2xl': 'sm:max-w-2xl',
};

/** Tela cheia no mobile, card centralizado a partir de `sm`. */
export function Modal({ title, onClose, size = 'lg', children }: Props) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    // Captura: se o modal estiver sobre o Drawer, o Esc fecha só o modal
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener('keydown', handleEsc, true);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc, true);
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative bg-white w-full h-dvh sm:h-auto sm:max-h-[90vh] sm:rounded-xl shadow-2xl flex flex-col ${sizes[size]}`}
      >
        <div className="flex items-center justify-between gap-2 pl-4 pr-2 py-1 sm:pl-6 sm:pr-4 sm:py-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
