import type { StatusAnalise } from '../types/api';

const config: Record<StatusAnalise, { label: string; className: string }> = {
  PENDENTE: { label: 'Pendente', className: 'bg-neutral-100 text-neutral-700' },
  EM_ANALISE: { label: 'Em análise', className: 'bg-blue-100 text-blue-700' },
  ATENDE: { label: '🟢 Atende', className: 'bg-green-100 text-green-700' },
  NAO_ATENDE: { label: '🔴 Não atende', className: 'bg-red-100 text-red-700' },
  REQUER_ANALISE: { label: '🟡 Requer análise', className: 'bg-yellow-100 text-yellow-700' },
  ERRO: { label: 'Erro', className: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }: { status: StatusAnalise }) {
  const { label, className } = config[status];
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${className}`}>
      {label}
    </span>
  );
}