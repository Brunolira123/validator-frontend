import { useEffect, useRef, type ReactNode } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';

interface Props {
  titulo: string;
  children: ReactNode;
  onConfirmar: () => void;
  onCancelar: () => void;
  excluindo: boolean;
  erro?: string | null;
}

/**
 * Confirmação de exclusão (soft delete). Bottom sheet no mobile, card centralizado a partir de `sm`.
 */
export function ConfirmarExclusao({ titulo, children, onConfirmar, onCancelar, excluindo, erro }: Props) {
  const onCancelarRef = useRef(onCancelar);
  useEffect(() => {
    onCancelarRef.current = onCancelar;
  });

  useEffect(() => {
    // Captura: sobre o Drawer, o Esc fecha só a confirmação
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCancelarRef.current();
    };
    document.addEventListener('keydown', handleEsc, true);
    return () => document.removeEventListener('keydown', handleEsc, true);
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-neutral-950/50 animate-fade-in"
        onClick={excluindo ? undefined : onCancelar}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] motion-safe:animate-slide-up"
      >
        <div className="flex items-start gap-4">
          <span className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full bg-red-50 text-red-600">
            <Trash2 size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-neutral-900">{titulo}</h2>
            <div className="mt-1 text-sm text-neutral-600 space-y-2">{children}</div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <Archive size={14} />
              Fica arquivado no sistema e pode ser recuperado pelo suporte.
            </p>
          </div>
        </div>

        {erro && (
          <div className="mt-4">
            <ErrorAlert>{erro}</ErrorAlert>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancelar} disabled={excluindo} autoFocus>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={onConfirmar} loading={excluindo}>
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Botão de lixeira para cards: 44px de toque e não propaga o clique pro card. */
export function BotaoExcluir({ onClick, rotulo }: { onClick: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="h-11 w-11 md:h-9 md:w-9 shrink-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
    >
      <Trash2 size={18} />
    </button>
  );
}
