import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Container, Database, LifeBuoy, Search, Upload } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { SituacaoAgenteBadge } from '../components/SituacaoAgenteBadge';
import { AmbienteClienteModal } from '../components/AmbienteClienteModal';
import { AtualizarAgentesModal } from '../components/AtualizarAgentesModal';
import { BadgeAtualizacao } from '../components/BadgeAtualizacao';
import { useIsAdmin } from '../stores/authStore';
import { abaixoDe, situacaoAtualizacao, versaoMaisNova } from '../versaoAgente';
import { tempoDesde } from '../labels';
import type { SuporteClienteResponse } from '../types/api';

const paradosDe = (c: SuporteClienteResponse) => (c.ambiente?.dockerDisponivel ? c.ambiente.parados : 0);
const offline = (c: SuporteClienteResponse) => c.situacao === 'OFFLINE';
const falhaAtualizacao = (c: SuporteClienteResponse) => situacaoAtualizacao(c) === 'FALHA';

type FiltroId = 'parado' | 'offline' | 'desatualizado' | 'falha' | 'piloto';

/** Problemas primeiro: offline, depois com container parado, depois por nome. */
function comparar(a: SuporteClienteResponse, b: SuporteClienteResponse) {
  return (
    Number(offline(b)) - Number(offline(a)) ||
    Number(paradosDe(b) > 0) - Number(paradosDe(a) > 0) ||
    a.nome.localeCompare(b.nome)
  );
}

/** Sem acento e minúsculo: "São" acha "sao". */
const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function Filtro({
  ativo,
  onClick,
  title,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      title={title}
      className={`min-h-11 md:min-h-9 px-3 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
        ativo ? 'bg-vr-600 border-vr-600 text-white' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  );
}

function ClienteCard({ cliente, onDetalhes }: { cliente: SuporteClienteResponse; onDetalhes: () => void }) {
  const { ambiente } = cliente;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-neutral-900 min-w-0 break-words">{cliente.nome}</p>
        <SituacaoAgenteBadge situacao={cliente.situacao} />
      </div>
      {cliente.versaoAlvoAgente && (
        <div className="mt-2">
          <BadgeAtualizacao cliente={cliente} />
        </div>
      )}

      <p className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
        <Database size={16} className="text-neutral-400 shrink-0" aria-hidden="true" />
        <span>
          Versão do BD (VRMaster):{' '}
          <span className="font-medium text-neutral-900">{cliente.versaoBanco ?? '—'}</span>
        </span>
      </p>

      {!ambiente ? (
        <p className="mt-2 text-sm text-neutral-500">Ambiente não informado (agente desatualizado)</p>
      ) : !ambiente.dockerDisponivel ? (
        <div className="mt-2 text-sm">
          <p className="flex items-center gap-2 font-medium text-amber-700">
            <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
            Docker indisponível
          </p>
          {ambiente.erro && <p className="mt-1 text-xs text-neutral-500 break-words">{ambiente.erro}</p>}
        </div>
      ) : (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-neutral-600">
          <Container size={16} className="text-neutral-400 shrink-0" aria-hidden="true" />
          <span>
            <span className="tabular-nums">
              {ambiente.rodando}/{ambiente.total}
            </span>{' '}
            rodando
          </span>
          {ambiente.parados > 0 && (
            <span className="font-medium text-red-600">⚠ {ambiente.parados} parado(s)</span>
          )}
        </p>
      )}

      {ambiente && (
        <p className="mt-1 text-xs text-neutral-400">Atualizado {tempoDesde(ambiente.coletadoEm)}</p>
      )}

      <button
        type="button"
        onClick={onDetalhes}
        className="mt-3 -ml-2 inline-flex items-center min-h-11 md:min-h-8 px-2 rounded-md text-sm font-semibold text-vr-700 hover:bg-vr-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
      >
        Detalhes
      </button>
    </Card>
  );
}

export default function SuporteClientes() {
  const [busca, setBusca] = useState('');
  // Filtros ligados somam (E): "Offline" + "Piloto" = clientes do piloto que estão offline
  const [filtros, setFiltros] = useState<Set<FiltroId>>(() => new Set());
  const [atualizarAberto, setAtualizarAberto] = useState(false);
  const isAdmin = useIsAdmin();
  // Guarda o id, não o objeto: o modal acompanha o refetch da lista
  const [detalhesId, setDetalhesId] = useState<number | null>(null);

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['monitor', 'suporte', 'clientes'],
    queryFn: monitorApi.suporteClientes,
    // Tela de acompanhamento: fica aberta no monitor do suporte
    refetchInterval: 60_000,
  });

  // "Desatualizado" = abaixo da versão estável mais nova em uso (ou sem versão informada)
  const referencia = clientes ? versaoMaisNova(clientes) : null;
  const opcoesFiltro: { id: FiltroId; label: string; title?: string; teste: (c: SuporteClienteResponse) => boolean }[] = [
    { id: 'parado', label: 'Com container parado', teste: (c) => paradosDe(c) > 0 },
    { id: 'offline', label: 'Offline', teste: offline },
    {
      id: 'desatualizado',
      label: 'Desatualizados',
      title: referencia ? `Agente abaixo da ${referencia}, a mais nova em uso` : undefined,
      teste: (c) => !!referencia && abaixoDe(c.versaoAgente, referencia),
    },
    { id: 'falha', label: 'Falha na atualização', teste: falhaAtualizacao },
    { id: 'piloto', label: 'Piloto', teste: (c) => c.piloto },
  ];
  const contagem = (id: FiltroId) => clientes?.filter(opcoesFiltro.find((o) => o.id === id)!.teste).length ?? 0;

  const alternarFiltro = (id: FiltroId) =>
    setFiltros((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const termo = normalizar(busca.trim());
  const ativos = opcoesFiltro.filter((o) => filtros.has(o.id));
  const filtrados = clientes
    ?.filter((c) => (!termo || normalizar(c.nome).includes(termo)) && ativos.every((o) => o.teste(c)))
    .sort(comparar);

  const comParado = contagem('parado');
  const qtdOffline = contagem('offline');
  const detalhes = clientes?.find((c) => c.id === detalhesId);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {clientes?.length ?? 0} cliente(s)
            {qtdOffline > 0 && <span className="text-neutral-700 font-medium"> · {qtdOffline} offline</span>}
            {comParado > 0 && <span className="text-red-600 font-medium"> · {comParado} com container parado</span>}
          </p>
        </div>
        {isAdmin && clientes && clientes.length > 0 && (
          <Button onClick={() => setAtualizarAberto(true)}>
            <Upload size={16} aria-hidden="true" />
            Atualizar agentes
          </Button>
        )}
      </div>

      {clientes && clientes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-80">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente"
              aria-label="Buscar cliente pelo nome"
              className="w-full min-h-11 pl-9 pr-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vr-500"
            />
          </div>
          <div role="group" aria-label="Filtrar clientes" className="flex flex-wrap gap-2">
            {opcoesFiltro.map((o) => (
              <Filtro key={o.id} ativo={filtros.has(o.id)} onClick={() => alternarFiltro(o.id)} title={o.title}>
                {o.label} ({contagem(o.id)})
              </Filtro>
            ))}
          </div>
        </div>
      )}

      {isLoading && <p className="text-neutral-500">Carregando...</p>}

      {error && <ErrorAlert>{mensagemErro(error, 'Erro ao carregar os clientes')}</ErrorAlert>}

      {clientes && clientes.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <LifeBuoy size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
            <p className="text-neutral-500 mt-3">Nenhum cliente com agente cadastrado.</p>
          </div>
        </Card>
      )}

      {clientes && clientes.length > 0 && filtrados?.length === 0 && (
        <Card>
          <p className="text-center text-neutral-500 py-6">Nenhum cliente encontrado com esses filtros.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
        {filtrados?.map((c) => (
          <ClienteCard key={c.id} cliente={c} onDetalhes={() => setDetalhesId(c.id)} />
        ))}
      </div>

      {detalhes && <AmbienteClienteModal cliente={detalhes} onClose={() => setDetalhesId(null)} />}

      {atualizarAberto && clientes && (
        <AtualizarAgentesModal clientes={clientes} onClose={() => setAtualizarAberto(false)} />
      )}
    </div>
  );
}
