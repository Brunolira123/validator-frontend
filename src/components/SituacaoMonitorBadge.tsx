import type { SituacaoMonitor } from '../types/api';

const config: Record<SituacaoMonitor, { label: string; className: string; dot: string }> = {
  OK: { label: 'OK', className: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  FALHA: { label: 'Falha', className: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  OFFLINE: { label: 'Offline', className: 'bg-neutral-800 text-white', dot: 'bg-neutral-400' },
  AGUARDANDO: { label: 'Aguardando agente', className: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  INATIVO: { label: 'Inativo', className: 'bg-neutral-100 text-neutral-500', dot: 'bg-neutral-400' },
};

export function SituacaoMonitorBadge({ situacao }: { situacao: SituacaoMonitor }) {
  const { label, className, dot } = config[situacao];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
