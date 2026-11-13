import { useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Activity, Plus, Upload } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { NovoClienteMonitoradoModal } from '../components/NovoClienteMonitoradoModal';
import { TokenAgenteModal } from '../components/TokenAgenteModal';
import { AtualizarAgentesModal } from '../components/AtualizarAgentesModal';
import { FiltrosClientes } from '../components/monitor/FiltrosClientes';
import { ClienteMonitorCard } from '../components/monitor/ClienteMonitorCard';
import { filtroDaUrl, temFiltro } from '../components/monitor/filtrosUrl';
import { useIsAdmin } from '../stores/authStore';
import type { ClienteListaResponse, SituacaoMonitor, TokenAgenteResponse } from '../types/api';

/** Problemas primeiro: quem abre a tela quer ver o que precisa de atenção. */
const prioridade: Record<SituacaoMonitor, number> = { OFFLINE: 0, FALHA: 1, AGUARDANDO: 2, OK: 3, INATIVO: 4 };

const parados = (c: ClienteListaResponse) => (c.ambiente?.dockerDisponivel ? c.ambiente.parados : 0);

function comparar(a: ClienteListaResponse, b: ClienteListaResponse) {
  return (
    prioridade[a.situacao] - prioridade[b.situacao] ||
    Number(parados(b) > 0) - Number(parados(a) > 0) ||
    a.nome.localeCompare(b.nome)
  );
}

const temProblema = (c: ClienteListaResponse) => c.situacao === 'FALHA' || c.situacao === 'OFFLINE';

/**
 * Lista única de clientes (Monitoramento + Suporte). Suporte → Clientes chega com ?foco=ambiente: os cards
 * abrem direto na aba Ambiente.
 */
export default function Monitoramento() {
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const [params] = useSearchParams();
  const [novoAberto, setNovoAberto] = useState(false);
  const [atualizarAberto, setAtualizarAberto] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<TokenAgenteResponse | null>(null);

  const filtro = filtroDaUrl(params);
  const focoAmbiente = params.get('foco') === 'ambiente';
  const filtrando = temFiltro(params);

  const { data: clientes, isLoading, isFetching, error } = useQuery({
    queryKey: ['monitor', 'clientes', filtro],
    queryFn: () => monitorApi.listar(filtro),
    // Troca de filtro não pisca a lista inteira
    placeholderData: keepPreviousData,
    // Tela de acompanhamento: fica aberta no monitor do suporte
    refetchInterval: 60_000,
  });

  // Só para a "Falha na atualização" e o "Atualizar agentes": a lista única não traz a última tentativa
  const { data: suporte } = useQuery({
    queryKey: ['monitor', 'suporte', 'clientes'],
    queryFn: monitorApi.suporteClientes,
    refetchInterval: 60_000,
  });
  const ultimaAtualizacao = new Map(suporte?.map((s) => [s.id, s.ultimaAtualizacao]));

  const ordenados = clientes ? [...clientes].sort(comparar) : undefined;
  const comProblema = clientes?.filter(temProblema).length ?? 0;
  const comParado = clientes?.filter((c) => parados(c) > 0).length ?? 0;
  const lista = params.toString() ? `?${params}` : '';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{focoAmbiente ? 'Clientes' : 'Monitoramento'}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {clientes?.length ?? 0} cliente(s){filtrando && ' no filtro'}
            {comProblema > 0 && <span className="text-red-600 font-medium"> · {comProblema} precisando de atenção</span>}
            {comParado > 0 && <span className="text-red-600 font-medium"> · {comParado} com container parado</span>}
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {suporte && suporte.length > 0 && (
              <Button variant="secondary" onClick={() => setAtualizarAberto(true)}>
                <Upload size={16} aria-hidden="true" />
                Atualizar agentes
              </Button>
            )}
            <Button onClick={() => setNovoAberto(true)}>
              <Plus size={16} aria-hidden="true" />
              Novo cliente
            </Button>
          </div>
        )}
      </div>

      <FiltrosClientes />

      {isLoading && <p className="text-neutral-500">Carregando...</p>}

      {error && <ErrorAlert>{mensagemErro(error, 'Erro ao carregar os clientes')}</ErrorAlert>}

      {clientes && clientes.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <Activity size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
            <p className="text-neutral-500 mt-3">
              {filtrando
                ? 'Nenhum cliente encontrado com esses filtros.'
                : `Nenhum cliente monitorado ainda.${isAdmin ? ' Clique em "Novo cliente" para gerar o token do agente.' : ''}`}
            </p>
          </div>
        </Card>
      )}

      <div
        aria-busy={isFetching}
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start transition-opacity ${
          isFetching && !isLoading ? 'opacity-60' : ''
        }`}
      >
        {ordenados?.map((c) => (
          <ClienteMonitorCard
            key={c.id}
            cliente={c}
            ultimaAtualizacao={ultimaAtualizacao.get(c.id)}
            para={`/monitoramento/clientes/${c.id}${focoAmbiente ? '?aba=ambiente' : ''}`}
            lista={lista}
          />
        ))}
      </div>

      {novoAberto && (
        <NovoClienteMonitoradoModal
          onClose={() => setNovoAberto(false)}
          onSuccess={(resultado) => {
            setNovoAberto(false);
            setTokenGerado(resultado);
            queryClient.invalidateQueries({ queryKey: ['monitor'] });
          }}
        />
      )}

      {tokenGerado && <TokenAgenteModal resultado={tokenGerado} onClose={() => setTokenGerado(null)} />}

      {atualizarAberto && suporte && (
        <AtualizarAgentesModal clientes={suporte} onClose={() => setAtualizarAberto(false)} />
      )}
    </div>
  );
}
