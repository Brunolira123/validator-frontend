import { corAvatar, iniciais } from '../../projetos';

/** Bolinha com as iniciais. `horas` ao lado vira "BR 12h". */
export function Avatar({ id, nome, tamanho = 'sm' }: { id: number; nome: string; tamanho?: 'sm' | 'md' }) {
  const dim = tamanho === 'md' ? 'h-8 w-8 text-xs' : 'h-6 w-6 text-[10px]';
  return (
    <span
      title={nome}
      aria-label={nome}
      className={`${dim} ${corAvatar(id)} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white`}
    >
      {iniciais(nome)}
    </span>
  );
}

/** Avatares sobrepostos (até `max`, o resto vira "+n"). */
export function Avatares({ pessoas, max = 4 }: { pessoas: { id: number; nome: string }[]; max?: number }) {
  if (pessoas.length === 0) return null;
  const visiveis = pessoas.slice(0, max);
  const resto = pessoas.length - visiveis.length;
  return (
    <span className="inline-flex items-center -space-x-1.5" aria-label={pessoas.map((p) => p.nome).join(', ')}>
      {visiveis.map((p) => (
        <Avatar key={p.id} id={p.id} nome={p.nome} />
      ))}
      {resto > 0 && (
        <span className="h-6 w-6 inline-flex items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700 ring-2 ring-white">
          +{resto}
        </span>
      )}
    </span>
  );
}
