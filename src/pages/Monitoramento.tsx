import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Activity, Plus, Store } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { SituacaoMonitorBadge } from '../components/SituacaoMonitorBadge';
import { InfoBancoCliente } from '../components/InfoBancoCliente';
import { NovoClienteMonitoradoModal } from '../components/NovoClienteMonitoradoModal';
import { TokenAgenteModal } from '../components/TokenAgenteModal';
import { useIsAdmin } from '../stores/authStore';
import { formatarCnpj, tempoDesde } from '../labels';
import type { ClienteMonitoradoResponse, SituacaoMonitor, TokenAgenteResponse } from '../types/api';

/** Problemas primeiro: quem abre a tela quer ver o que precisa de atenção. */
const prioridade: Record<SituacaoMonitor, number> = { OFFLINE: 0, FALHA: 1, AGUARDANDO: 2, OK: 3, INATIVO: 4 };

function resumoLojas(c: ClienteMonitoradoResponse) {
  if (c.situacao === 'AGUARDANDO') return 'Agente ainda não enviou resultado';
  if (c.lojasComFalha > 0) return `${c.lojasComFalha} de ${c.totalLojas} loja(s) com falha`;
  return `${c.totalLojas} loja(s) ok`;
}

export default function Monitoramento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const [novoAberto, setNovoAberto] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<TokenAgenteResponse | null>(null);

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['monitor', 'clientes'],
    queryFn: monitorApi.listar,
    // Tela de acompanhamento: fica aberta no monitor do suporte
    refetchInterval: 60_000,
  });

  const ordenados = clientes
    ? [...clientes].sort((a, b) => prioridade[a.situacao] - prioridade[b.situacao] || a.nome.localeCompare(b.nome))
    : undefined;
  const comProblema = clientes?.filter((c) => c.situacao === 'FALHA' || c.situacao === 'OFFLINE').length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Monitoramento</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {clientes?.length ?? 0} cliente(s)
            {comProblema > 0 && <span className="text-red-600 font-medium"> · {comProblema} precisando de atenção</span>}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setNovoAberto(true)}>
            <Plus size={16} />
            Novo cliente
          </Button>
        )}
      </div>

      {isLoading && <p className="text-neutral-500">Carregando...</p>}

      {error && <ErrorAlert>{mensagemErro(error, 'Erro ao carregar clientes monitorados')}</ErrorAlert>}

      {clientes && clientes.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <Activity size={32} className="mx-auto text-neutral-300" />
            <p className="text-neutral-500 mt-3">
              Nenhum cliente monitorado ainda.
              {isAdmin && ' Clique em "Novo cliente" para gerar o token do agente.'}
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {ordenados?.map((c) => (
          <Card key={c.id} interativo onClick={() => navigate(`/monitoramento/clientes/${c.id}`)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{c.nome}</p>
                {c.cnpj && <p className="text-xs text-neutral-500">{formatarCnpj(c.cnpj)}</p>}
              </div>
              <SituacaoMonitorBadge situacao={c.situacao} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
              <Store size={16} className="text-neutral-400 shrink-0" />
              <span className={c.lojasComFalha > 0 ? 'text-red-600 font-medium' : ''}>{resumoLojas(c)}</span>
            </div>
            <div className="mt-2">
              <InfoBancoCliente cliente={c} />
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {c.ultimoContato ? `Último contato ${tempoDesde(c.ultimoContato)}` : 'Agente nunca se conectou'}
            </p>
          </Card>
        ))}
      </div>

      {novoAberto && (
        <NovoClienteMonitoradoModal
          onClose={() => setNovoAberto(false)}
          onSuccess={(resultado) => {
            setNovoAberto(false);
            setTokenGerado(resultado);
            queryClient.invalidateQueries({ queryKey: ['monitor', 'clientes'] });
          }}
        />
      )}

      {tokenGerado && <TokenAgenteModal resultado={tokenGerado} onClose={() => setTokenGerado(null)} />}
    </div>
  );
}
