import { situacaoAtualizacao } from '../versaoAgente';
import type { SuporteClienteResponse } from '../types/api';

/**
 * "→ 2.4.1 pendente" ou "Falha na atualização"; nada quando não há versão alvo.
 * `semVersao`: só "Pendente", para quando a versão alvo já aparece ao lado.
 */
export function BadgeAtualizacao({ cliente, semVersao = false }: { cliente: SuporteClienteResponse; semVersao?: boolean }) {
  const situacao = situacaoAtualizacao(cliente);
  if (!situacao) return null;

  if (situacao === 'FALHA') {
    const u = cliente.ultimaAtualizacao;
    return (
      <span
        title={u?.detalhe ?? undefined}
        className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700"
      >
        Falha na atualização
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-sky-100 text-sky-800 tabular-nums">
      {semVersao ? 'Pendente' : `→ ${cliente.versaoAlvoAgente} pendente`}
    </span>
  );
}
