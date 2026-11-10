import { situacaoLabel } from '../../projetos';
import type { SituacaoPlanejamento } from '../../types/projetos';

const cor: Record<SituacaoPlanejamento, string> = {
  RASCUNHO: 'bg-vr-50 text-vr-800',
  EM_PLANEJAMENTO: 'bg-amber-100 text-amber-800',
  ENVIADO: 'bg-green-100 text-green-800',
  CRIADO_ARTIA: 'bg-blue-100 text-blue-800',
  CANCELADO: 'bg-neutral-200 text-neutral-600',
};

/** Rascunho criado pelo LTO mostra a origem ("Rascunho · veio do LTO"). */
export function SituacaoPlanejamentoBadge({
  situacao,
  doLto = false,
}: {
  situacao: SituacaoPlanejamento;
  doLto?: boolean;
}) {
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${cor[situacao]}`}>
      {situacaoLabel[situacao]}
      {situacao === 'RASCUNHO' && doLto && ' · veio do LTO'}
    </span>
  );
}
