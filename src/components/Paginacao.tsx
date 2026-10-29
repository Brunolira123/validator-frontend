import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  /** 1-based. */
  pagina: number;
  totalPaginas: number;
  onChange: (pagina: number) => void;
  disabled?: boolean;
}

/** 1 … 4 5 6 … 14: sempre a primeira, a última e as vizinhas da atual. */
function numeros(pagina: number, total: number): (number | 'gap')[] {
  const set = new Set([1, total, pagina - 1, pagina, pagina + 1]);
  // Perto das pontas mostra uma a mais, para não ter "…" escondendo uma página só
  if (pagina <= 3) set.add(2).add(3).add(4);
  if (pagina >= total - 2) set.add(total - 1).add(total - 2).add(total - 3);
  const ordenados = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const resultado: (number | 'gap')[] = [];
  ordenados.forEach((n, i) => {
    if (i > 0 && n - ordenados[i - 1] > 1) resultado.push('gap');
    resultado.push(n);
  });
  return resultado;
}

const seta =
  'h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500';

/** Numerada a partir de md; no celular, compacta (‹ 3 / 14 ›). */
export function Paginacao({ pagina, totalPaginas, onChange, disabled = false }: Props) {
  if (totalPaginas <= 1) return null;
  const anterior = (
    <button
      type="button"
      className={seta}
      onClick={() => onChange(pagina - 1)}
      disabled={disabled || pagina <= 1}
      aria-label="Página anterior"
    >
      <ChevronLeft size={18} aria-hidden="true" />
    </button>
  );
  const proxima = (
    <button
      type="button"
      className={seta}
      onClick={() => onChange(pagina + 1)}
      disabled={disabled || pagina >= totalPaginas}
      aria-label="Próxima página"
    >
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  );

  return (
    <nav aria-label="Páginas" className="flex items-center justify-center gap-1.5">
      {anterior}
      <span className="md:hidden px-3 text-sm text-neutral-700 tabular-nums">
        <span aria-hidden="true">
          {pagina} / {totalPaginas}
        </span>
        <span className="sr-only">
          Página {pagina} de {totalPaginas}
        </span>
      </span>
      <ul className="hidden md:flex items-center gap-1.5">
        {numeros(pagina, totalPaginas).map((n, i) =>
          n === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="w-6 text-center text-neutral-400">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                onClick={() => onChange(n)}
                disabled={disabled}
                aria-current={n === pagina ? 'page' : undefined}
                aria-label={`Página ${n}`}
                className={`min-w-9 h-9 px-2 rounded-lg text-sm font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
                  n === pagina
                    ? 'bg-vr-600 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100 disabled:opacity-40'
                }`}
              >
                {n}
              </button>
            </li>
          )
        )}
      </ul>
      {proxima}
    </nav>
  );
}
