import { useCallback, useState } from 'react';
import { AlertTriangle, Bot, Database, Info, Play, RotateCw, ScrollText } from 'lucide-react';
import { Modal } from './Modal';
import { SituacaoAgenteBadge } from './SituacaoAgenteBadge';
import { LogContainerPainel } from './LogContainerPainel';
import { AcaoContainerPainel } from './AcaoContainerPainel';
import { AgenteVersaoBloco } from './AgenteVersaoBloco';
import { tempoDesde } from '../labels';
import { useIsAdmin } from '../stores/authStore';
import { abaixoDe, VERSAO_MINIMA_ACAO, VERSAO_MINIMA_LOG } from '../versaoAgente';
import type { SuporteClienteResponse, TipoAcaoContainer } from '../types/api';

/** Por que o log não pode ser pedido (null = pode). Vale para o cliente inteiro. */
function motivoSemLog(c: SuporteClienteResponse): string | null {
  if (c.situacao === 'OFFLINE') return 'Cliente offline: o agente não buscaria o pedido.';
  if (abaixoDe(c.versaoAgente, VERSAO_MINIMA_LOG)) {
    return `Agente desatualizado (${c.versaoAgente ?? 'versão desconhecida'}): o log precisa da ${VERSAO_MINIMA_LOG} ou mais nova.`;
  }
  return null;
}

/** Idem para Iniciar/Reiniciar. */
function motivoSemAcao(c: SuporteClienteResponse): string | null {
  if (c.situacao === 'OFFLINE') return 'Cliente offline: o agente não buscaria o pedido.';
  if (abaixoDe(c.versaoAgente, VERSAO_MINIMA_ACAO)) {
    return `Agente desatualizado (${c.versaoAgente ?? 'versão desconhecida'}): iniciar e reiniciar precisam da ${VERSAO_MINIMA_ACAO} ou mais nova.`;
  }
  return null;
}

/** Um aviso só, para o celular (sem tooltip): junta os motivos sem repetir o "offline". */
function avisoIndisponivel(semLog: string | null, semAcao: string | null) {
  if (semLog && semAcao) return semLog === semAcao ? `Log e ações indisponíveis. ${semLog}` : `Log e ações indisponíveis. ${semLog} ${semAcao}`;
  if (semAcao) return `Iniciar e reiniciar indisponíveis. ${semAcao}`;
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

const botaoLinha =
  'inline-flex items-center gap-1 min-h-11 md:min-h-8 px-2 rounded-md text-sm font-semibold text-vr-700 hover:bg-vr-50 disabled:text-neutral-300 disabled:hover:bg-transparent disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500';

type Painel = { tipo: 'log'; container: string } | { tipo: 'acao'; container: string; acao: TipoAcaoContainer } | null;

interface Props {
  cliente: SuporteClienteResponse;
  onClose: () => void;
}

/** Detalhes do ambiente de um cliente: containers (log, iniciar/reiniciar) e, para ADMIN/DIRETORIA, o agente. */
export function AmbienteClienteModal({ cliente, onClose }: Props) {
  const isAdmin = useIsAdmin();
  const [painel, setPainel] = useState<Painel>(null);
  const voltar = useCallback(() => setPainel(null), []);
  const { ambiente } = cliente;
  const semLog = motivoSemLog(cliente);
  const semAcao = motivoSemAcao(cliente);
  const aviso = avisoIndisponivel(semLog, semAcao);

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

        {painel?.tipo === 'log' ? (
          <LogContainerPainel clienteId={cliente.id} clienteNome={cliente.nome} container={painel.container} onVoltar={voltar} />
        ) : painel?.tipo === 'acao' ? (
          <AcaoContainerPainel
            clienteId={cliente.id}
            clienteNome={cliente.nome}
            container={painel.container}
            tipo={painel.acao}
            onVoltar={voltar}
          />
        ) : (
          <>
            {!ambiente ? (
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
                {aviso && (
                  // No celular não há tooltip: o motivo fica visível aqui
                  <p className="mb-3 flex items-start gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 text-xs text-neutral-600">
                    <Info size={14} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
                    {aviso}
                  </p>
                )}
                {/* Celular: nome e situação na 1ª linha, versão e botões na 2ª. sm+: uma linha por container */}
                <div
                  aria-hidden="true"
                  className="hidden sm:grid grid-cols-[minmax(0,1fr)_8rem_6rem_12rem] gap-x-3 border-b border-neutral-200 py-2 text-xs font-medium text-neutral-500"
                >
                  <span>Container</span>
                  <span>Versão</span>
                  <span>Situação</span>
                  <span className="sr-only">Ações</span>
                </div>
                <ul className="divide-y divide-neutral-100">
                  {containers.map((c) => {
                    const acao: TipoAcaoContainer = c.rodando ? 'RESTART' : 'START';
                    return (
                      <li
                        key={c.nome}
                        className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_8rem_6rem_12rem] items-center gap-x-3 py-1.5"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-neutral-800" title={c.nome}>
                          {c.nome}
                        </span>
                        <span
                          className={`justify-self-end sm:justify-self-auto sm:order-3 text-xs font-semibold ${
                            c.rodando ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          {c.rodando ? 'Rodando' : 'Parado'}
                        </span>
                        <span
                          className="min-w-0 truncate text-xs text-neutral-500 tabular-nums sm:order-2"
                          title={c.versao ?? undefined}
                        >
                          <span className="sm:hidden">Versão </span>
                          {c.versao ?? '—'}
                        </span>
                        <span className="flex justify-end -mr-2 sm:order-4">
                          {/* Botão desabilitado não dispara hover: o title fica no invólucro */}
                          <span title={semLog ?? undefined} className="inline-block">
                            <button
                              type="button"
                              disabled={!!semLog}
                              onClick={() => setPainel({ tipo: 'log', container: c.nome })}
                              aria-label={`Log de ${c.nome}`}
                              className={botaoLinha}
                            >
                              <ScrollText size={16} aria-hidden="true" className="hidden sm:block" />
                              Log
                            </button>
                          </span>
                          <span title={semAcao ?? undefined} className="inline-block">
                            <button
                              type="button"
                              disabled={!!semAcao}
                              onClick={() => setPainel({ tipo: 'acao', container: c.nome, acao })}
                              aria-label={`${c.rodando ? 'Reiniciar' : 'Iniciar'} ${c.nome}`}
                              className={botaoLinha}
                            >
                              {c.rodando ? (
                                <RotateCw size={16} aria-hidden="true" className="hidden sm:block" />
                              ) : (
                                <Play size={16} aria-hidden="true" className="hidden sm:block" />
                              )}
                              {c.rodando ? 'Reiniciar' : 'Iniciar'}
                            </button>
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {isAdmin && <AgenteVersaoBloco cliente={cliente} />}
          </>
        )}
      </div>
    </Modal>
  );
}
