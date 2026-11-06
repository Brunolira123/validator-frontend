import { useState } from 'react';
import { AlertTriangle, Bot, Database, Info, ScrollText } from 'lucide-react';
import { Modal } from './Modal';
import { SituacaoAgenteBadge } from './SituacaoAgenteBadge';
import { LogContainerPainel } from './LogContainerPainel';
import { tempoDesde } from '../labels';
import type { SuporteClienteResponse } from '../types/api';

/** Primeira versão do agente que atende pedido de log. */
const VERSAO_MINIMA_LOG = '2.3.0';

/** "2.10.1" > "2.9.0". Sufixos como "-beta" são ignorados. */
function versaoMenor(versao: string, minima: string) {
  const partes = (v: string) => v.split(/[.-]/).slice(0, 3).map((p) => parseInt(p, 10) || 0);
  const a = partes(versao);
  const b = partes(minima);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

/** Por que o log não pode ser pedido (null = pode). Vale para o cliente inteiro. */
function motivoSemLog(c: SuporteClienteResponse): string | null {
  if (c.situacao === 'OFFLINE') return 'Cliente offline: o agente não buscaria o pedido.';
  if (!c.versaoAgente || versaoMenor(c.versaoAgente, VERSAO_MINIMA_LOG)) {
    return `Agente desatualizado (${c.versaoAgente ?? 'versão desconhecida'}): o log precisa da ${VERSAO_MINIMA_LOG} ou mais nova.`;
  }
  return null;
}

function Dado({ icone: Icone, rotulo, valor }: { icone: typeof Database; rotulo: string; valor: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-neutral-600 min-w-0">
      <Icone size={16} className="text-neutral-400 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        {rotulo}: <span className="font-medium text-neutral-900 break-words">{valor}</span>
      </span>
    </p>
  );
}

interface Props {
  cliente: SuporteClienteResponse;
  onClose: () => void;
}

/** Detalhes do ambiente de um cliente: containers e, por container, o log pedido ao agente. */
export function AmbienteClienteModal({ cliente, onClose }: Props) {
  const [containerLog, setContainerLog] = useState<string | null>(null);
  const { ambiente } = cliente;
  const semLog = motivoSemLog(cliente);

  const containers = ambiente
    ? [...ambiente.containers].sort((a, b) => Number(a.rodando) - Number(b.rodando) || a.nome.localeCompare(b.nome))
    : [];

  return (
    <Modal title={cliente.nome} onClose={onClose} size="4xl">
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 mb-4 border-b border-neutral-200">
          <SituacaoAgenteBadge situacao={cliente.situacao} />
          <Dado icone={Database} rotulo="Versão do BD (VRMaster)" valor={cliente.versaoBanco ?? '—'} />
          <Dado icone={Bot} rotulo="Agente" valor={cliente.versaoAgente ?? '—'} />
          {ambiente && <span className="text-xs text-neutral-400">Atualizado {tempoDesde(ambiente.coletadoEm)}</span>}
        </div>

        {containerLog ? (
          <LogContainerPainel
            clienteId={cliente.id}
            clienteNome={cliente.nome}
            container={containerLog}
            onVoltar={() => setContainerLog(null)}
          />
        ) : !ambiente ? (
          <p className="text-sm text-neutral-500">Ambiente não informado (agente desatualizado)</p>
        ) : !ambiente.dockerDisponivel ? (
          <div className="text-sm">
            <p className="flex items-center gap-2 font-medium text-amber-700">
              <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
              Docker indisponível
            </p>
            {ambiente.erro && <p className="mt-1 text-xs text-neutral-500 break-words">{ambiente.erro}</p>}
          </div>
        ) : containers.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum container no servidor.</p>
        ) : (
          <>
            {semLog && (
              // No celular não há tooltip: o motivo fica visível aqui
              <p className="mb-3 flex items-start gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 text-xs text-neutral-600">
                <Info size={14} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
                Log indisponível. {semLog}
              </p>
            )}
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-medium text-neutral-500">
                  <th scope="col" className="py-2 pr-2 font-medium">
                    Container
                  </th>
                  <th scope="col" className="w-16 sm:w-28 py-2 pr-2 font-medium">
                    Versão
                  </th>
                  <th scope="col" className="w-16 sm:w-24 py-2 pr-2 font-medium">
                    Situação
                  </th>
                  <th scope="col" className="w-16 sm:w-20 py-2 font-medium">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {containers.map((c) => (
                  <tr key={c.nome}>
                    <td className="py-2 pr-2">
                      <span className="block truncate font-medium text-neutral-800" title={c.nome}>
                        {c.nome}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <span className="block truncate text-xs text-neutral-500 tabular-nums" title={c.versao ?? undefined}>
                        {c.versao ?? '—'}
                      </span>
                    </td>
                    <td className={`py-2 pr-2 text-xs font-semibold ${c.rodando ? 'text-green-700' : 'text-red-600'}`}>
                      {c.rodando ? 'Rodando' : 'Parado'}
                    </td>
                    <td className="py-1 text-right">
                      {/* Botão desabilitado não dispara hover: o title fica no invólucro */}
                      <span title={semLog ?? undefined} className="inline-block">
                        <button
                          type="button"
                          disabled={!!semLog}
                          onClick={() => setContainerLog(c.nome)}
                          aria-label={`Log de ${c.nome}`}
                          className="inline-flex items-center gap-1 min-h-11 md:min-h-8 px-2 rounded-md text-sm font-semibold text-vr-700 hover:bg-vr-50 disabled:text-neutral-300 disabled:hover:bg-transparent disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
                        >
                          <ScrollText size={16} aria-hidden="true" className="hidden sm:block" />
                          Log
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </Modal>
  );
}
