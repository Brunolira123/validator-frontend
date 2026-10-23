import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CircleCheck, TriangleAlert, Unplug, type LucideIcon } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Card } from './Card';
import { ErrorAlert } from './ErrorAlert';
import { SituacaoMonitorBadge } from './SituacaoMonitorBadge';
import { tempoDesde } from '../labels';
import type { ClienteMonitoradoResponse, SituacaoMonitor } from '../types/api';

/** Ordem da barra e da legenda: problemas primeiro. Cores iguais às do SituacaoMonitorBadge. */
const situacoes: { situacao: SituacaoMonitor; label: string; cor: string }[] = [
  { situacao: 'FALHA', label: 'Falha', cor: 'bg-red-500' },
  { situacao: 'OFFLINE', label: 'Offline', cor: 'bg-neutral-700' },
  { situacao: 'AGUARDANDO', label: 'Aguardando agente', cor: 'bg-amber-500' },
  { situacao: 'OK', label: 'OK', cor: 'bg-green-500' },
  { situacao: 'INATIVO', label: 'Inativo', cor: 'bg-neutral-300' },
];

const MAX_RANKING = 8;

const temProblema = (c: ClienteMonitoradoResponse) => c.situacao === 'FALHA' || c.situacao === 'OFFLINE';

function detalheProblema(c: ClienteMonitoradoResponse) {
  if (c.situacao === 'OFFLINE') {
    return c.ultimoContato ? `Sem contato ${tempoDesde(c.ultimoContato)}` : 'Agente nunca se conectou';
  }
  return `${c.lojasComFalha} de ${c.totalLojas} loja(s)`;
}

interface CardSituacaoProps {
  label: string;
  valor: number;
  icone: LucideIcon;
  /** Cor do ícone e do fundo dele; com valor zero o card fica neutro. */
  cor: { icone: string; fundo: string };
  detalhe?: string;
}

function CardSituacao({ label, valor, icone: Icone, cor, detalhe }: CardSituacaoProps) {
  const ativo = valor > 0;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3">
      <div className={`p-2 rounded-lg shrink-0 ${ativo ? cor.fundo : 'bg-neutral-100'}`}>
        <Icone size={18} aria-hidden="true" className={ativo ? cor.icone : 'text-neutral-400'} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-600">{label}</p>
        <p className="text-2xl font-semibold text-neutral-900 mt-0.5">{valor.toLocaleString('pt-BR')}</p>
        {detalhe && <p className="text-xs text-neutral-500 mt-0.5">{detalhe}</p>}
      </div>
    </div>
  );
}

export function DashboardMonitoramento() {
  const navigate = useNavigate();
  // Mesma query da tela de Monitoramento: reaproveita o cache ao navegar
  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['monitor', 'clientes'],
    queryFn: monitorApi.listar,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Card><p className="text-neutral-500">Carregando monitoramento...</p></Card>;
  if (error) return <ErrorAlert>{mensagemErro(error, 'Erro ao carregar o monitoramento')}</ErrorAlert>;
  if (!clientes || clientes.length === 0) return null;

  const qtd = (situacao: SituacaoMonitor) => clientes.filter((c) => c.situacao === situacao).length;
  const contagem = situacoes
    .map((s) => ({ ...s, qtd: clientes.filter((c) => c.situacao === s.situacao).length }))
    .filter((s) => s.qtd > 0);

  const comProblema = clientes
    .filter(temProblema)
    .sort(
      (a, b) =>
        b.lojasComFalha - a.lojasComFalha ||
        (a.situacao === b.situacao ? 0 : a.situacao === 'FALHA' ? -1 : 1) ||
        a.nome.localeCompare(b.nome),
    );
  const ranking = comProblema.slice(0, MAX_RANKING);
  const maxLojas = Math.max(1, ...ranking.map((c) => c.lojasComFalha));
  const lojasComFalha = clientes.reduce((soma, c) => soma + c.lojasComFalha, 0);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-neutral-900">Monitoramento</h2>
        <button
          type="button"
          onClick={() => navigate('/monitoramento')}
          className="inline-flex items-center gap-1 min-h-11 md:min-h-0 text-sm text-vr-700 font-medium hover:underline"
        >
          Ver todos
          <ChevronRight size={16} />
        </button>
      </div>

      <p className="text-sm text-neutral-500">{clientes.length.toLocaleString('pt-BR')} cliente(s) monitorado(s)</p>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CardSituacao
          label="Clientes OK"
          valor={qtd('OK')}
          icone={CircleCheck}
          cor={{ icone: 'text-green-600', fundo: 'bg-green-50' }}
        />
        <CardSituacao
          label="Consistência sem finalizar"
          valor={qtd('FALHA')}
          icone={TriangleAlert}
          cor={{ icone: 'text-red-600', fundo: 'bg-red-50' }}
          detalhe={lojasComFalha > 0 ? `${lojasComFalha.toLocaleString('pt-BR')} loja(s) com falha` : undefined}
        />
        <CardSituacao
          label="Agentes offline"
          valor={qtd('OFFLINE')}
          icone={Unplug}
          cor={{ icone: 'text-neutral-800', fundo: 'bg-neutral-200' }}
        />
      </div>

      {/* Distribuição por situação: barra empilhada + legenda com os números (a legenda é a versão em texto) */}
      <div className="mt-5">
        <div
          role="img"
          aria-label={`Clientes por situação: ${contagem.map((s) => `${s.label} ${s.qtd}`).join(', ')}`}
          className="flex gap-[2px] h-3"
        >
          {contagem.map((s, i) => (
            <div
              key={s.situacao}
              title={`${s.label}: ${s.qtd} cliente(s)`}
              style={{ flexGrow: s.qtd }}
              className={`min-w-1 ${s.cor} ${i === 0 ? 'rounded-l' : ''} ${i === contagem.length - 1 ? 'rounded-r' : ''}`}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
          {contagem.map((s) => (
            <li key={s.situacao} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-2 w-2 rounded-sm ${s.cor}`} />
              {s.label}
              <span className="font-semibold text-neutral-900">{s.qtd}</span>
            </li>
          ))}
        </ul>
      </div>

      <h3 className="mt-6 text-sm font-medium text-neutral-700">Clientes com problema · lojas com falha</h3>
      {ranking.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
          <CircleCheck size={18} className="text-green-600 shrink-0" aria-hidden="true" />
          Nenhum cliente com problema agora.
        </p>
      ) : (
        <ul className="mt-2 -mx-2">
          {ranking.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => navigate(`/monitoramento/clientes/${c.id}`)}
                title={`${c.nome}: ${detalheProblema(c)}`}
                className="w-full grid grid-cols-[minmax(0,10rem)_1fr] sm:grid-cols-[minmax(0,14rem)_1fr_auto] items-center gap-x-3 gap-y-1 px-2 py-2 min-h-11 rounded-lg text-left hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-neutral-900 truncate">{c.nome}</span>
                  {c.situacao === 'OFFLINE' && <SituacaoMonitorBadge situacao="OFFLINE" />}
                </span>
                <span className="h-3 bg-neutral-100 rounded-r" aria-hidden="true">
                  {c.lojasComFalha > 0 && (
                    <span
                      className="block h-full bg-red-500 rounded-r"
                      style={{ width: `${(c.lojasComFalha / maxLojas) * 100}%` }}
                    />
                  )}
                </span>
                <span className="col-span-2 sm:col-span-1 text-xs text-neutral-500 whitespace-nowrap sm:text-right">
                  {detalheProblema(c)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {comProblema.length > MAX_RANKING && (
        <p className="mt-2 text-xs text-neutral-500">
          e mais {comProblema.length - MAX_RANKING} cliente(s) com problema.
        </p>
      )}
    </Card>
  );
}
