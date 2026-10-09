import type { StatusLevantamento } from '../types/api';

const config: Record<StatusLevantamento, { label: string; className: string }> = {
  RASCUNHO: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700' },
  EM_ANALISE: { label: 'Em análise', className: 'bg-blue-100 text-blue-700' },
  CONCLUIDO: { label: 'Concluído', className: 'bg-green-100 text-green-700' },
  CANCELADO: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
};

export function StatusLevantamentoBadge({ status }: { status: StatusLevantamento }) {
  const { label, className } = config[status];
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${className}`}>
      {label}
    </span>
  );
}