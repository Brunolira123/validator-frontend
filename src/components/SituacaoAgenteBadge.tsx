import type { SituacaoAgente } from '../types/api';

export function SituacaoAgenteBadge({ situacao }: { situacao: SituacaoAgente }) {
  const online = situacao === 'ONLINE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
        online ? 'bg-green-100 text-green-700' : 'bg-neutral-800 text-white'
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-neutral-400'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}
