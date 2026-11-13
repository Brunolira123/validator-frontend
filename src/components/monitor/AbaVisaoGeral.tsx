import type { ReactNode } from 'react';
import { AlertTriangle, ChevronRight, CircleCheck, CircleX } from 'lucide-react';
import { Card } from '../Card';
import { BadgeAtualizacao } from '../BadgeAtualizacao';
import { resumoExecucao } from './textos';
import { formatarDataHora, tempoDesde, verificacaoLabel } from '../../labels';
import { situacaoAtualizacao } from '../../versaoAgente';
import type { ClienteListaResponse, ExecucaoMonitor, SuporteClienteResponse } from '../../types/api';

export type AbaCliente = 'visao' | 'verificacoes' | 'ambiente' | 'agente';

const MAX_FALHAS_HISTORICO = 5;

interface Alerta {
  texto: string;
  detalhe?: string | null;
  aba: AbaCliente;
}

/** O que precisa de atenção agora, do mais grave para o menos. */
function alertasAtuais(c: ClienteListaResponse, suporte: SuporteClienteResponse | undefined): Alerta[] {
  const alertas: Alerta[] = [];
  if (!c.ativo) return alertas;
  if (c.situacao === 'OFFLINE') {
    alertas.push({ texto: `Agente sem contato ${c.ultimoContato ? tempoDesde(c.ultimoContato) : ''}`.trim(), aba: 'ambiente' });
  }
  if (c.situacao === 'AGUARDANDO') alertas.push({ texto: 'O agente ainda não enviou resultado', aba: 'verificacoes' });
  if (c.hoje?.erro) {
    alertas.push({ texto: 'Não conseguiu consultar o banco hoje', detalhe: c.hoje.erro, aba: 'verificacoes' });
  }
  for (const v of c.hoje?.verificacoes ?? []) {
    if (v.falhas > 0) {
      alertas.push({
        texto: `${verificacaoLabel(v.tipo)} falhou em ${v.falhas} de ${v.lojas} loja(s)`,
        aba: 'verificacoes',
      });
    }
  }
  if (c.ambiente && !c.ambiente.dockerDisponivel) {
    alertas.push({ texto: 'Docker indisponível no servidor', detalhe: c.ambiente.erro, aba: 'ambiente' });
  } else if (c.ambiente && c.ambiente.parados > 0) {
    const nomes = suporte?.ambiente?.containers.filter((x) => !x.rodando).map((x) => x.nome);
    alertas.push({ texto: `${c.ambiente.parados} container(s) parado(s)`, detalhe: nomes?.join(', '), aba: 'ambiente' });
  }
  if (suporte && situacaoAtualizacao(suporte) === 'FALHA') {
    alertas.push({
      texto: `Falha na atualização do agente para a ${suporte.versaoAlvoAgente}`,
      detalhe: suporte.ultimaAtualizacao?.detalhe,
      aba: 'agente',
    });
  }
  return alertas;
}

function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-base font-semibold text-neutral-900">{titulo}</h2>
        {acao}
      </div>
      {children}
    </Card>
  );
}

function LinkAba({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mr-2 inline-flex items-center gap-0.5 min-h-11 md:min-h-8 px-2 rounded-md text-sm font-semibold text-vr-700 hover:bg-vr-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
    >
      {children}
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5 text-sm">
      <dt className="text-neutral-500">{rotulo}</dt>
      <dd className="min-w-0 text-right text-neutral-900 break-words">{children}</dd>
    </div>
  );
}

interface Props {
  cliente: ClienteListaResponse;
  suporte: SuporteClienteResponse | undefined;
  historico: ExecucaoMonitor[] | undefined;
  /** Sem a aba Agente (não é ADMIN/DIRETORIA), o alerta dela não vira link. */
  abas: AbaCliente[];
  onIrPara: (aba: AbaCliente) => void;
}

export function AbaVisaoGeral({ cliente: c, suporte, historico, abas, onIrPara }: Props) {
  const alertas = alertasAtuais(c, suporte);
  const falhasRecentes = historico?.filter((e) => !e.ok).slice(0, MAX_FALHAS_HISTORICO) ?? [];
  const { hoje, ambiente } = c;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <Secao titulo="Hoje" acao={<LinkAba onClick={() => onIrPara('verificacoes')}>Verificações</LinkAba>}>
        {!hoje ? (
          <p className="text-sm text-neutral-500">
            Nenhuma verificação hoje.
            {c.ultimaExecucaoEm && ` A última chegou ${tempoDesde(c.ultimaExecucaoEm)}.`}
          </p>
        ) : hoje.erro ? (
          <p className="flex items-start gap-2 text-sm text-red-600">
            <CircleX size={18} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">Não consultou o banco: {hoje.erro}</span>
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {hoje.verificacoes.map((v) => (
                <li key={v.tipo} className="flex items-center gap-2 text-sm">
                  {v.falhas > 0 ? (
                    <CircleX size={18} className="text-red-600 shrink-0" aria-hidden="true" />
                  ) : (
                    <CircleCheck size={18} className="text-green-600 shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-neutral-900">{verificacaoLabel(v.tipo)}</span>
                  <span className={`ml-auto tabular-nums ${v.falhas > 0 ? 'font-medium text-red-600' : 'text-neutral-500'}`}>
                    {v.falhas > 0 ? `${v.falhas} de ${v.lojas} loja(s) com falha` : `${v.lojas} loja(s) ok`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-neutral-400">Recebida às {formatarDataHora(hoje.execucaoEm)}</p>
          </>
        )}
      </Secao>

      <Secao titulo="Alertas">
        {alertas.length === 0 && falhasRecentes.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum alerta nos últimos 30 dias.</p>
        ) : (
          <>
            {alertas.length > 0 && (
              <ul className="space-y-1">
                {alertas.map((a) => {
                  const conteudo = (
                    <>
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="font-medium text-neutral-900">{a.texto}</span>
                        {a.detalhe && <span className="block text-xs text-neutral-500 break-words">{a.detalhe}</span>}
                      </span>
                    </>
                  );
                  return (
                    <li key={a.texto}>
                      {abas.includes(a.aba) ? (
                        <button
                          type="button"
                          onClick={() => onIrPara(a.aba)}
                          className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
                        >
                          {conteudo}
                          <ChevronRight size={16} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
                        </button>
                      ) : (
                        <div className="flex items-start gap-2 py-2 text-sm">{conteudo}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {falhasRecentes.length > 0 && (
              <>
                <h3 className="mt-3 mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Últimas execuções com falha
                </h3>
                <ul className="divide-y divide-neutral-100">
                  {falhasRecentes.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5 text-sm">
                      <span className="text-neutral-900 whitespace-nowrap tabular-nums">{formatarDataHora(e.recebidoEm)}</span>
                      <span className="min-w-0 text-neutral-500 break-words">{resumoExecucao(e)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Secao>

      <Secao titulo="Ambiente" acao={c.ativo && <LinkAba onClick={() => onIrPara('ambiente')}>Containers</LinkAba>}>
        <dl className="divide-y divide-neutral-100">
          <Linha rotulo="Versão do BD (VRMaster)">{c.versaoBanco ?? '—'}</Linha>
          <Linha rotulo="Containers">
            {!ambiente ? (
              <span className="text-neutral-500">Não informado</span>
            ) : !ambiente.dockerDisponivel ? (
              <span className="font-medium text-amber-700">Docker indisponível</span>
            ) : (
              <>
                <span className="tabular-nums">
                  {ambiente.rodando}/{ambiente.total} rodando
                </span>
                {ambiente.parados > 0 && <span className="ml-2 font-medium text-red-600">⚠ {ambiente.parados} parado(s)</span>}
              </>
            )}
          </Linha>
          {ambiente && <Linha rotulo="Coletado">{tempoDesde(ambiente.coletadoEm)}</Linha>}
        </dl>
      </Secao>

      <Secao
        titulo="Agente"
        acao={abas.includes('agente') && <LinkAba onClick={() => onIrPara('agente')}>Gerenciar</LinkAba>}
      >
        <dl className="divide-y divide-neutral-100">
          <Linha rotulo="Versão">
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              <span className="tabular-nums">{c.versaoAgente ?? '—'}</span>
              <BadgeAtualizacao
                cliente={{ versaoAlvoAgente: c.versaoAlvoAgente, ultimaAtualizacao: suporte?.ultimaAtualizacao }}
              />
            </span>
          </Linha>
          <Linha rotulo="Último contato">{c.ultimoContato ? tempoDesde(c.ultimoContato) : 'nunca'}</Linha>
          <Linha rotulo="Updater">
            {c.updater ? `Instalado${c.updater.versao ? ` · ${c.updater.versao}` : ''}` : <span className="text-neutral-500">Não instalado</span>}
          </Linha>
          <Linha rotulo="Piloto">{c.piloto ? 'Sim' : 'Não'}</Linha>
        </dl>
      </Secao>
    </div>
  );
}
