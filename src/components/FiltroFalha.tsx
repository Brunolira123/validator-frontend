export type FiltroFalha = 'FALHA' | 'OK' | 'TODAS';

const opcoes: { valor: FiltroFalha; label: string }[] = [
  { valor: 'FALHA', label: 'Com falha' },
  { valor: 'OK', label: 'Sem falha' },
  { valor: 'TODAS', label: 'Todas' },
];

interface Props {
  valor: FiltroFalha;
  onChange: (valor: FiltroFalha) => void;
  contagem: Record<FiltroFalha, number>;
  /** Nome do que está sendo filtrado, para leitores de tela ("lojas", "clientes"). */
  rotulo: string;
  /** "Todas" (lojas) ou "Todos" (clientes). */
  labelTodas?: string;
}

/** Com falha / Sem falha / Todas, com a quantidade de cada. */
export function FiltroFalhaSelector({ valor, onChange, contagem, rotulo, labelTodas = 'Todas' }: Props) {
  return (
    <div role="group" aria-label={`Filtrar ${rotulo}`} className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={`min-h-11 md:min-h-0 px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
            valor === o.valor ? 'bg-vr-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          {o.valor === 'TODAS' ? labelTodas : o.label} ({contagem[o.valor]})
        </button>
      ))}
    </div>
  );
}
