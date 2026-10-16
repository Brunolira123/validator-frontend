import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleCheck, CircleX, KeyRound, Loader2, RefreshCw } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { Modal } from '../components/Modal';
import { SituacaoMonitorBadge } from '../components/SituacaoMonitorBadge';
import { InfoBancoCliente } from '../components/InfoBancoCliente';
import { NfceNaoTransmitidas } from '../components/NfceNaoTransmitidas';
import { TokenAgenteModal } from '../components/TokenAgenteModal';
import { useIsAdmin } from '../stores/authStore';
import { formatarCnpj, formatarDataHora, formatarDiaMes, tempoDesde, verificacaoLabel } from '../labels';
import type { PedidoConsulta, TokenAgenteResponse } from '../types/api';

const pedidoAberto = (p?: PedidoConsulta) => p?.status === 'PENDENTE' || p?.status === 'ENTREGUE';

const textoPedido: Record<PedidoConsulta['status'], string> = {
  PENDENTE: 'Aguardando o agente buscar o pedido (até ~30s)...',
  ENTREGUE: 'O agente está consultando o banco do cliente...',
  CONCLUIDO: 'Consulta concluída.',
  EXPIRADO: 'O agente não respondeu a tempo. Ele pode estar offline.',
};

export default function MonitoramentoCliente() {
  const { id } = useParams<{ id: string }>();
  const clienteId = Number(id);
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const [confirmarToken, setConfirmarToken] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<TokenAgenteResponse | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['monitor', 'cliente', clienteId],
    queryFn: () => monitorApi.detalhar(clienteId),
    enabled: !isNaN(clienteId),
    refetchInterval: 60_000,
  });

  const { data: historico } = useQuery({
    queryKey: ['monitor', 'historico', clienteId],
    queryFn: () => monitorApi.historico(clienteId),
    enabled: !isNaN(clienteId),
  });

  const atualizarTudo = () => {
    queryClient.invalidateQueries({ queryKey: ['monitor', 'cliente', clienteId] });
    queryClient.invalidateQueries({ queryKey: ['monitor', 'historico', clienteId] });
    queryClient.invalidateQueries({ queryKey: ['monitor', 'clientes'] });
  };

  const consultarMutation = useMutation({
    mutationFn: () => monitorApi.consultar(clienteId),
    onSuccess: (p) => setPedidoId(p.id),
  });

  // Acompanha o "Consultar agora" até concluir ou expirar
  const { data: pedido } = useQuery({
    queryKey: ['monitor', 'pedido', pedidoId],
    queryFn: async () => {
      const p = await monitorApi.pedido(pedidoId!);
      if (p.status === 'CONCLUIDO') atualizarTudo();
      return p;
    },
    enabled: pedidoId != null,
    refetchInterval: (query) => (pedidoAberto(query.state.data) || !query.state.data ? 3_000 : false),
  });

  const tokenMutation = useMutation({
    mutationFn: () => monitorApi.gerarNovoToken(clienteId),
    onSuccess: (resultado) => {
      setConfirmarToken(false);
      setTokenGerado(resultado);
    },
  });

  if (isLoading) return <p className="text-neutral-500">Carregando...</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <ErrorAlert>{error ? mensagemErro(error, 'Erro ao carregar cliente') : 'Cliente não encontrado'}</ErrorAlert>
        <Link to="/monitoramento" className="inline-flex items-center gap-2 text-sm text-vr-700 font-medium hover:underline">
          <ArrowLeft size={16} />
          Voltar para o monitoramento
        </Link>
      </div>
    );
  }

  const { cliente, lojas, erro } = data;
  const consultando = consultarMutation.isPending || pedidoAberto(pedido);

  return (
    <div>
      <Link
        to="/monitoramento"
        className="inline-flex items-center gap-2 min-h-11 md:min-h-0 text-sm text-neutral-500 hover:text-neutral-700 mb-4 md:mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para o monitoramento
      </Link>

      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900">{cliente.nome}</h1>
              <SituacaoMonitorBadge situacao={cliente.situacao} />
            </div>
            {cliente.cnpj && <p className="text-sm text-neutral-500 mt-1">{formatarCnpj(cliente.cnpj)}</p>}
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
              <div>
                <dt className="inline text-neutral-500">Último contato: </dt>
                <dd className="inline text-neutral-900">
                  {cliente.ultimoContato ? tempoDesde(cliente.ultimoContato) : 'nunca'}
                </dd>
              </div>
              <div>
                <dt className="inline text-neutral-500">Última verificação: </dt>
                <dd className="inline text-neutral-900">
                  {cliente.ultimaExecucaoEm ? formatarDataHora(cliente.ultimaExecucaoEm) : '—'}
                </dd>
              </div>
              <div>
                <dt className="inline text-neutral-500">Agente: </dt>
                <dd className="inline text-neutral-900">{cliente.versaoAgente ?? '—'}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <InfoBancoCliente cliente={cliente} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
              <Button variant="secondary" onClick={() => setConfirmarToken(true)}>
                <KeyRound size={16} />
                Novo token
              </Button>
            )}
            <Button onClick={() => consultarMutation.mutate()} loading={consultando} disabled={!cliente.ativo}>
              {!consultando && <RefreshCw size={16} />}
              Consultar agora
            </Button>
          </div>
        </div>

        {pedido && (
          <p
            role="status"
            className={`mt-4 text-sm flex items-center gap-2 ${
              pedido.status === 'EXPIRADO' ? 'text-red-600' : 'text-neutral-600'
            }`}
          >
            {pedidoAberto(pedido) && <Loader2 size={14} className="animate-spin" />}
            {textoPedido[pedido.status]}
          </p>
        )}
        {consultarMutation.error && (
          <div className="mt-4">
            <ErrorAlert>{mensagemErro(consultarMutation.error, 'Erro ao pedir a consulta')}</ErrorAlert>
          </div>
        )}
      </Card>

      {erro && (
        <div className="mb-6">
          <ErrorAlert>
            <strong>O agente não conseguiu consultar o banco do cliente:</strong> {erro}
          </ErrorAlert>
        </div>
      )}

      <h2 className="text-lg font-semibold text-neutral-900 mb-3">Lojas</h2>
      {lojas.length === 0 && !erro && (
        <Card>
          <p className="text-center text-neutral-500 py-6">
            {cliente.situacao === 'AGUARDANDO'
              ? 'O agente ainda não enviou nenhum resultado.'
              : 'Nenhuma loja ativa no último resultado.'}
          </p>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {lojas.map((loja) => (
          <Card key={loja.lojaId} className={loja.ok ? '' : 'border-red-200'}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{loja.descricao ?? `Loja ${loja.lojaId}`}</p>
                {loja.cnpj && <p className="text-xs text-neutral-500">{formatarCnpj(loja.cnpj)}</p>}
              </div>
              <span className="text-xs text-neutral-400 shrink-0">#{loja.lojaId}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {loja.verificacoes.map((v) => (
                <li key={v.tipo} className="flex items-start gap-2 text-sm">
                  {v.ok ? (
                    <CircleCheck size={18} className="text-green-600 shrink-0" aria-label="ok" />
                  ) : (
                    <CircleX size={18} className="text-red-600 shrink-0" aria-label="falha" />
                  )}
                  <div className="min-w-0">
                    <span className="text-neutral-900">{verificacaoLabel(v.tipo)}</span>
                    {v.referencia && <span className="text-neutral-400"> · {formatarDiaMes(v.referencia)}</span>}
                    {v.detalhe && <p className="text-xs text-red-600">{v.detalhe}</p>}
                  </div>
                </li>
              ))}
            </ul>
            {loja.nfceNaoTransmitidas.length > 0 && (
              <NfceNaoTransmitidas
                nfce={loja.nfceNaoTransmitidas}
                dia={loja.verificacoes.find((v) => v.tipo === 'CONSISTENCIA')?.referencia ?? null}
              />
            )}
          </Card>
        ))}
      </div>

      {historico && historico.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-neutral-900 mt-8 mb-3">Histórico (30 dias)</h2>
          <Card className="!p-0 overflow-hidden">
            <ul className="divide-y divide-neutral-100">
              {historico.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  {e.ok ? (
                    <CircleCheck size={16} className="text-green-600 shrink-0" aria-label="ok" />
                  ) : (
                    <CircleX size={16} className="text-red-600 shrink-0" aria-label="falha" />
                  )}
                  <span className="text-neutral-900 whitespace-nowrap">{formatarDataHora(e.recebidoEm)}</span>
                  <span className="text-neutral-500 truncate">
                    {e.erro
                      ? `Erro: ${e.erro}`
                      : e.lojasComFalha > 0
                        ? `${e.lojasComFalha} de ${e.totalLojas} loja(s) com falha`
                        : `${e.totalLojas} loja(s) ok`}
                  </span>
                  <span className="ml-auto text-xs text-neutral-400 whitespace-nowrap">
                    {e.origem === 'SOB_DEMANDA' ? 'Consultar agora' : 'Agendada'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {confirmarToken && (
        <Modal title="Gerar novo token?" onClose={() => setConfirmarToken(false)}>
          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-neutral-700">
              O token atual de <strong>{cliente.nome}</strong> para de funcionar na hora. O agente só volta a
              reportar depois que o novo token for colocado no <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">vr.properties</code>{' '}
              do cliente.
            </p>
            {tokenMutation.error && <ErrorAlert>{mensagemErro(tokenMutation.error, 'Erro ao gerar token')}</ErrorAlert>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmarToken(false)}>
                Cancelar
              </Button>
              <Button variant="danger" loading={tokenMutation.isPending} onClick={() => tokenMutation.mutate()}>
                Gerar novo token
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {tokenGerado && <TokenAgenteModal resultado={tokenGerado} onClose={() => setTokenGerado(null)} />}
    </div>
  );
}
