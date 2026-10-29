import { useEffect, useId, useRef, type RefObject } from 'react';
import { X } from 'lucide-react';
import { categoriaProspeccaoLabel, categoriasProspeccao, gruposCategoriaProspeccao } from '../labels';
import type { CategoriaProspeccao } from '../types/api';
import { Button } from './Button';

interface CamposProps {
  selecionadas: CategoriaProspeccao[];
  onChange: (categorias: CategoriaProspeccao[]) => void;
}

/** Checkboxes agrupados (Mercados, Perecíveis, Outros) com "Todas" e "Limpar". */
export function CategoriasCheckboxes({ selecionadas, onChange }: CamposProps) {
  const id = useId();
  const alternar = (c: CategoriaProspeccao) =>
    onChange(selecionadas.includes(c) ? selecionadas.filter((x) => x !== c) : [...selecionadas, c]);

  return (
    <div>
      <div className="flex items-center gap-1 -ml-2 mb-1">
        <button
          type="button"
          onClick={() => onChange([...categoriasProspeccao])}
          disabled={selecionadas.length === categoriasProspeccao.length}
          className="min-h-11 md:min-h-8 px-2 text-sm font-medium text-vr-700 rounded-md hover:underline underline-offset-2 disabled:text-neutral-400 disabled:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
        >
          Todas
        </button>
        <span aria-hidden="true" className="text-neutral-300">
          ·
        </span>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={selecionadas.length === 0}
          className="min-h-11 md:min-h-8 px-2 text-sm font-medium text-vr-700 rounded-md hover:underline underline-offset-2 disabled:text-neutral-400 disabled:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
        >
          Limpar
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
        {gruposCategoriaProspeccao.map((grupo) => (
          <fieldset key={grupo.titulo} className="min-w-0">
            <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">{grupo.titulo}</legend>
            {grupo.categorias.map((c) => (
              <label
                key={c}
                htmlFor={`${id}-${c}`}
                className="flex items-center gap-3 min-h-11 md:min-h-9 text-sm text-neutral-800 cursor-pointer"
              >
                <input
                  id={`${id}-${c}`}
                  type="checkbox"
                  checked={selecionadas.includes(c)}
                  onChange={() => alternar(c)}
                  className="w-5 h-5 accent-vr-600 border-neutral-300 rounded focus:ring-vr-500"
                />
                {categoriaProspeccaoLabel[c]}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
}

/**
 * Popover das categorias no desktop, abaixo do botão "Categorias". Não é modal: fecha no Esc (devolvendo o foco
 * ao botão) e clicando fora de `ancora` (o wrapper do botão + popover).
 */
export function CategoriasPopover({
  selecionadas,
  onChange,
  onClose,
  ancora,
}: CamposProps & { onClose: (devolverFoco: boolean) => void; ancora: RefObject<HTMLElement | null> }) {
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    painel.current?.querySelector<HTMLInputElement>('input[type=checkbox]')?.focus();
    const fora = (e: PointerEvent) => {
      if (!ancora.current?.contains(e.target as Node)) onCloseRef.current(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCloseRef.current(true);
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', esc, true);
    };
  }, [ancora]);

  return (
    <div
      ref={painel}
      role="dialog"
      aria-labelledby={tituloId}
      className="absolute right-0 top-full mt-2 z-30 w-[40rem] rounded-xl border border-neutral-200 bg-white p-4 shadow-xl animate-fade-in"
    >
      <h2 id={tituloId} className="sr-only">
        Categorias
      </h2>
      <CategoriasCheckboxes selecionadas={selecionadas} onChange={onChange} />
    </div>
  );
}

/** Painel que sobe de baixo no celular com as categorias. As mudanças valem na hora; "Pronto" só fecha. */
export function CategoriasSheet({ selecionadas, onChange, onClose }: CamposProps & { onClose: () => void }) {
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    painel.current?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener('keydown', esc, true);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc, true);
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  const n = selecionadas.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-neutral-950/50 animate-fade-in" onClick={onClose} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="relative w-full max-h-[85dvh] flex flex-col bg-white rounded-t-2xl shadow-2xl focus:outline-none motion-safe:animate-slide-up"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 border-b border-neutral-200">
          <h2 id={tituloId} className="text-base font-bold text-neutral-900">
            Categorias
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-11 w-11 -mr-2 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          <CategoriasCheckboxes selecionadas={selecionadas} onChange={onChange} />
        </div>
        <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-neutral-200">
          <Button type="button" onClick={onClose} className="w-full">
            {n === 0 ? 'Pronto' : `Pronto · ${n} ${n === 1 ? 'categoria' : 'categorias'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
