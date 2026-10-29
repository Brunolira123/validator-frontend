import { UserRound } from 'lucide-react';
import { motivoPerdaLabel, statusProspectLabel, temperaturaLabel } from '../labels';
import type { MotivoPerda, StatusProspect, TemperaturaNegociacao } from '../types/api';

const corStatus: Record<StatusProspect, string> = {
  NOVO: 'bg-vr-50 text-vr-800',
  VISITADO: 'bg-neutral-100 text-neutral-700',
  FECHADO: 'bg-green-100 text-green-800',
  LTO: 'bg-green-700 text-white',
  PERDIDO: 'bg-neutral-200 text-neutral-700',
  DESCARTADO: 'bg-neutral-100 text-neutral-500',
};

// Temperatura da negociação: FRIA azul, MORNA âmbar, QUENTE vermelho
const corTemperatura: Record<TemperaturaNegociacao, { className: string; dot: string }> = {
  FRIA: { className: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  MORNA: { className: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  QUENTE: { className: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const base = 'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap';

/** Status do funil; visitado com temperatura mostra a cor da negociação e perdido mostra o motivo. */
export function StatusProspectBadge({
  status,
  temperatura,
  motivoPerda,
}: {
  status: StatusProspect;
  temperatura?: TemperaturaNegociacao | null;
  motivoPerda?: MotivoPerda | null;
}) {
  if (status === 'PERDIDO' && motivoPerda) {
    return (
      <span className={`${base} ${corStatus.PERDIDO}`}>
        Perdido · {motivoPerdaLabel[motivoPerda]}
      </span>
    );
  }
  if (status === 'VISITADO' && temperatura) {
    const { className, dot } = corTemperatura[temperatura];
    return (
      <span className={`${base} ${className}`}>
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        Visitado · {temperaturaLabel[temperatura]}
      </span>
    );
  }
  return <span className={`${base} ${corStatus[status]}`}>{statusProspectLabel[status]}</span>;
}

/** Lugar que já é prospect de outro comercial: avisa sem mostrar o funil dele. */
export function DeOutroComercialBadge() {
  return (
    <span className={`${base} bg-neutral-100 text-neutral-600`}>
      <UserRound size={12} aria-hidden="true" />
      Prospect de outro comercial
    </span>
  );
}
