import { useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, Container, Database, LifeBuoy, Search } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { tempoDesde } from '../labels';
import type { SituacaoAgente, SuporteClienteResponse } from '../types/api';

const paradosDe = (c: SuporteClienteResponse) => (c.ambiente?.dockerDisponivel ? c.ambiente.parados : 0);
const offline = (c: SuporteClienteResponse) => c.situacao === 'OFFLINE';

/** Problemas primeiro: offline, depois com container parado, depois por nome. */
function comparar(a: SuporteClienteResponse, b: SuporteClienteResponse) {
  return (
    Number(offline(b)) - Number(offline(a)) ||
    Number(paradosDe(b) > 0) - Number(paradosDe(a) > 0) ||
    a.nome.localeCompare(b.nome)
  );
}

/** Sem acento e minúsculo: "São" acha "sao". */
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function SituacaoAgenteBadge({ situacao }: { situacao: SituacaoAgente }) {
  const online = situacao === 'ONLINE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
        online ? 'bg-green-100 text-green-700' : 'bg-neutral-800 text-white'
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-neutral-400'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

function Filtro({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`min-h-11 md:min-h-9 px-3 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
        ativo ? 'bg-vr-600 border-vr-600 text-white' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  );
}

function ClienteCard({ cliente }: { cliente: SuporteClienteResponse }) {
  const [aberto, setAberto] = useState(false);
  const listaId = useId();
  const { ambiente } = cliente;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-neutral-900 min-w-0 break-words">{cliente.nome}</p>
        <SituacaoAgenteBadge situacao={cliente.situacao} />
      </div>

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

      {ambiente?.dockerDisponivel && ambiente.total > 0 && (
        <>
          <button
            type="button"
            aria-expanded={aberto}
            aria-controls={listaId}
            onClick={() => setAberto((v) => !v)}
            className="mt-3 -ml-2 inline-flex items-center gap-1 min-h-11 md:min-h-8 px-2 rounded-md text-sm font-semibold text-vr-700 hover:bg-vr-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
          >
            {aberto ? 'Ocultar ambiente' : 'Ver ambiente'}
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`transition-transform ${aberto ? 'rotate-180' : ''}`}
            />
          </button>
          {aberto && (
            <ul id={listaId} className="mt-2 divide-y divide-neutral-100 border-t border-neutral-100">
              {/* O backend já manda parados primeiro; reordena para não depender disso */}
              {[...ambiente.containers]
                .sort((a, b) => Number(a.rodando) - Number(b.rodando) || a.nome.localeCompare(b.nome))
                .map((c) => (
                  <li key={c.nome} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium text-neutral-800" title={c.nome}>
                      {c.nome}
                    </span>
                    <span className="text-xs text-neutral-500 tabular-nums shrink-0">{c.versao ?? '—'}</span>
                    <span
                      className={`shrink-0 text-xs font-semibold ${c.rodando ? 'text-green-700' : 'text-red-600'}`}
                    >
                      {c.rodando ? 'Rodando' : 'Parado'}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

export default function SuporteClientes() {
  const [busca, setBusca] = useState('');
  const [soParados, setSoParados] = useState(false);
  const [soOffline, setSoOffline] = useState(false);

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['monitor', 'suporte', 'clientes'],
    queryFn: monitorApi.suporteClientes,
    // Tela de acompanhamento: fica aberta no monitor do suporte
    refetchInterval: 60_000,
  });

  const termo = normalizar(busca.trim());
  const filtrados = clientes
    ?.filter(
      (c) =>
        (!termo || normalizar(c.nome).includes(termo)) &&
        (!soParados || paradosDe(c) > 0) &&
        (!soOffline || offline(c)),
    )
    .sort(comparar);

  const comParado = clientes?.filter((c) => paradosDe(c) > 0).length ?? 0;
  const qtdOffline = clientes?.filter(offline).length ?? 0;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {clientes?.length ?? 0} cliente(s)
          {qtdOffline > 0 && <span className="text-neutral-700 font-medium"> · {qtdOffline} offline</span>}
          {comParado > 0 && <span className="text-red-600 font-medium"> · {comParado} com container parado</span>}
        </p>
      </div>

      {clientes && clientes.length > 0 && (
        <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2">
          <div className="relative md:w-80">
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
            <Filtro ativo={soParados} onClick={() => setSoParados((v) => !v)}>
              Com container parado ({comParado})
            </Filtro>
            <Filtro ativo={soOffline} onClick={() => setSoOffline((v) => !v)}>
              Offline ({qtdOffline})
            </Filtro>
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
          <ClienteCard key={c.id} cliente={c} />
        ))}
      </div>
    </div>
  );
}
