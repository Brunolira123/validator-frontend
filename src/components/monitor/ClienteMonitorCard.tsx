import { Link } from 'react-router-dom';
import { AlertTriangle, Bot, CircleCheck, CircleX, Container, Database, PowerOff } from 'lucide-react';
import { SituacaoMonitorBadge } from '../SituacaoMonitorBadge';
import { BadgeAtualizacao } from '../BadgeAtualizacao';
import { formatarCnpj, tempoDesde, verificacaoLabel } from '../../labels';
import { textoDesativacao } from './textos';
import type { ClienteListaResponse, UltimaAtualizacaoAgente } from '../../types/api';

function VerificacoesHoje({ cliente }: { cliente: ClienteListaResponse }) {
  const { hoje } = cliente;
  if (!hoje) {
    return (
      <p className="text-sm text-neutral-500">
        {cliente.situacao === 'AGUARDANDO' ? 'Agente ainda não enviou resultado' : 'Nenhuma verificação hoje'}
      </p>
    );
  }
  if (hoje.erro) {
    return (
      <p className="flex items-start gap-1.5 text-sm font-medium text-red-600">
        <CircleX size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0">Não consultou o banco hoje</span>
      </p>
    );
  }
  if (hoje.verificacoes.length === 0) return <p className="text-sm text-neutral-500">Nenhuma loja verificada hoje</p>;

  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm" aria-label="Verificações de hoje">
      {hoje.verificacoes.map((v) => (
        <li key={v.tipo} className="inline-flex items-center gap-1">
          {v.falhas > 0 ? (
            <CircleX size={16} className="text-red-600 shrink-0" aria-hidden="true" />
          ) : (
            <CircleCheck size={16} className="text-green-600 shrink-0" aria-hidden="true" />
          )}
          <span className="text-neutral-800">{verificacaoLabel(v.tipo)}</span>
          {v.falhas > 0 ? (
            <span className="font-medium text-red-600 tabular-nums">
              {v.falhas}/{v.lojas} com falha
            </span>
          ) : (
            <span className="sr-only">ok</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Containers({ cliente }: { cliente: ClienteListaResponse }) {
  const { ambiente } = cliente;
  if (!ambiente) return <span className="text-neutral-500">Ambiente não informado</span>;
  if (!ambiente.dockerDisponivel) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-amber-700">
        <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
        Docker indisponível
      </span>
    );
  }
  return (
    <span>
      Containers{' '}
      <span className="font-medium text-neutral-900 tabular-nums">
        {ambiente.rodando}/{ambiente.total}
      </span>
      {ambiente.parados > 0 && <span className="ml-2 font-medium text-red-600">⚠ {ambiente.parados} parado(s)</span>}
    </span>
  );
}

interface Props {
  cliente: ClienteListaResponse;
  /** Da lista do Suporte: decide o "Falha na atualização". */
  ultimaAtualizacao?: UltimaAtualizacaoAgente | null;
  /** Para onde o card leva (já com a aba). */
  para: string;
  /** Filtros da lista, para o "Voltar" da página do cliente. */
  lista: string;
}

export function ClienteMonitorCard({ cliente: c, ultimaAtualizacao, para, lista }: Props) {
  const inativo = !c.ativo;

  return (
    <Link
      to={para}
      state={{ lista }}
      className={`block rounded-xl border p-4 sm:p-5 shadow-card transition-all duration-200 hover:shadow-card-hover active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
        inativo ? 'bg-neutral-50 border-neutral-200 hover:border-neutral-300' : 'bg-white border-neutral-200 hover:border-vr-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-semibold break-words ${inativo ? 'text-neutral-500' : 'text-neutral-900'}`}>{c.nome}</p>
          {c.cnpj && <p className="text-xs text-neutral-500">{formatarCnpj(c.cnpj)}</p>}
        </div>
        <SituacaoMonitorBadge situacao={c.situacao} />
      </div>

      {inativo ? (
        <div className="mt-3 text-sm text-neutral-500">
          <p className="flex items-start gap-1.5">
            <PowerOff size={16} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
            <span className="min-w-0 break-words">
              {textoDesativacao(c)}
              {c.desativacao?.motivo && <> · {c.desativacao.motivo}</>}
            </span>
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3">
            <VerificacoesHoje cliente={c} />
          </div>

          <div className="mt-3 space-y-1.5 text-sm text-neutral-600">
            <p className="flex items-center gap-2">
              <Database size={16} className="text-neutral-400 shrink-0" aria-hidden="true" />
              <span>
                Versão do BD <span className="font-medium text-neutral-900 tabular-nums">{c.versaoBanco ?? '—'}</span>
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Container size={16} className="text-neutral-400 shrink-0" aria-hidden="true" />
              <Containers cliente={c} />
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Bot size={16} className="text-neutral-400 shrink-0" aria-hidden="true" />
              <span>
                Agente <span className="font-medium text-neutral-900 tabular-nums">{c.versaoAgente ?? '—'}</span>
              </span>
              <BadgeAtualizacao cliente={{ versaoAlvoAgente: c.versaoAlvoAgente, ultimaAtualizacao }} />
              {c.piloto && (
                <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-800">
                  Piloto
                </span>
              )}
            </p>
          </div>

          <p className="mt-2 text-xs text-neutral-400">
            {c.ultimoContato ? `Atualizado ${tempoDesde(c.ultimoContato)}` : 'Agente nunca se conectou'}
          </p>
        </>
      )}
    </Link>
  );
}
