import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, CircleX, Loader2, RefreshCw } from 'lucide-react';
import { monitorApi } from '../../api/monitor';
import { mensagemErro } from '../../api/erro';
import { Button } from '../Button';
import { Card } from '../Card';
import { ErrorAlert } from '../ErrorAlert';
import { InfoBancoCliente } from '../InfoBancoCliente';
import { NfceNaoTransmitidas } from '../NfceNaoTransmitidas';
import { FiltroFalhaSelector, type FiltroFalha } from '../FiltroFalha';
import { formatarCnpj, formatarDataHora, formatarDiaMes, verificacaoLabel } from '../../labels';
import { resumoExecucao } from './textos';
import type { ClienteMonitoradoDetalhe, ExecucaoMonitor, PedidoConsulta } from '../../types/api';

const pedidoAberto = (p?: PedidoConsulta) => p?.status === 'PENDENTE' || p?.status === 'ENTREGUE';

const textoPedido: Record<PedidoConsulta['status'], string> = {
  PENDENTE: 'Aguardando o agente buscar o pedido (até ~30s)...',
  ENTREGUE: 'O agente está consultando o banco do cliente...',
  CONCLUIDO: 'Consulta concluída.',
  EXPIRADO: 'O agente não respondeu a tempo. Ele pode estar offline.',
};

const vazioFiltro: Record<FiltroFalha, string> = {
  FALHA: 'Nenhuma loja com falha. 🎉',
  OK: 'Nenhuma loja sem falha.',
  TODAS: 'Nenhuma loja ativa no último resultado.',
};

interface Props {
  detalhe: ClienteMonitoradoDetalhe;
  historico: ExecucaoMonitor[] | undefined;
}

/** Lojas da última execução, "Consultar agora" e histórico de 30 dias. */
export function AbaVerificacoes({ detalhe, historico }: Props) {
  const queryClient = useQueryClient();
  const { cliente, lojas, erro } = detalhe;
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  // Por padrão só as com falha: é o que o suporte precisa resolver
  const [filtro, setFiltro] = useState<FiltroFalha>('FALHA');

  const consultar = useMutation({
    mutationFn: () => monitorApi.consultar(cliente.id),
    onSuccess: (p) => setPedidoId(p.id),
  });

  // Acompanha o "Consultar agora" até concluir ou expirar
  const { data: pedido } = useQuery({
    queryKey: ['monitor', 'pedido', pedidoId],
    queryFn: async () => {
      const p = await monitorApi.pedido(pedidoId!);
      if (p.status === 'CONCLUIDO') {
        queryClient.invalidateQueries({ queryKey: ['monitor', 'cliente', cliente.id] });
        queryClient.invalidateQueries({ queryKey: ['monitor', 'historico', cliente.id] });
        queryClient.invalidateQueries({ queryKey: ['monitor', 'clientes'] });
      }
      return p;
    },
    enabled: pedidoId != null,
    refetchInterval: (query) => (pedidoAberto(query.state.data) || !query.state.data ? 3_000 : false),
  });

  const consultando = consultar.isPending || pedidoAberto(pedido);
  const qtdComFalha = lojas.filter((l) => !l.ok).length;
  const contagem: Record<FiltroFalha, number> = {
    FALHA: qtdComFalha,
    OK: lojas.length - qtdComFalha,
    TODAS: lojas.length,
  };
  const lojasFiltradas = filtro === 'TODAS' ? lojas : lojas.filter((l) => (filtro === 'FALHA' ? !l.ok : l.ok));

  return (
    <div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-sm text-neutral-600">
              Última verificação:{' '}
              <span className="font-medium text-neutral-900">
                {cliente.ultimaExecucaoEm ? formatarDataHora(cliente.ultimaExecucaoEm) : '—'}
              </span>
            </p>
            <InfoBancoCliente cliente={cliente} />
          </div>
          <span
            className="w-full sm:w-auto"
            title={cliente.ativo ? undefined : 'Cliente desativado: o agente não é mais aceito'}
          >
            <Button
              className="w-full sm:w-auto"
              onClick={() => consultar.mutate()}
              loading={consultando}
              disabled={!cliente.ativo}
            >
              {!consultando && <RefreshCw size={16} aria-hidden="true" />}
              Consultar agora
            </Button>
          </span>
        </div>

        {pedido && (
          <p
            role="status"
            className={`mt-4 text-sm flex items-center gap-2 ${
              pedido.status === 'EXPIRADO' ? 'text-red-600' : 'text-neutral-600'
            }`}
          >
            {pedidoAberto(pedido) && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {textoPedido[pedido.status]}
          </p>
        )}
        {consultar.error && (
          <div className="mt-4">
            <ErrorAlert>{mensagemErro(consultar.error, 'Erro ao pedir a consulta')}</ErrorAlert>
          </div>
        )}
      </Card>

      {erro && (
        <div className="mb-4">
          <ErrorAlert>
            <strong>O agente não conseguiu consultar o banco do cliente:</strong> {erro}
          </ErrorAlert>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">Lojas</h2>
        {lojas.length > 0 && (
          <FiltroFalhaSelector valor={filtro} onChange={setFiltro} contagem={contagem} rotulo="lojas" />
        )}
      </div>
      {lojas.length === 0 && !erro && (
        <Card>
          <p className="text-center text-neutral-500 py-6">
            {cliente.situacao === 'AGUARDANDO'
              ? 'O agente ainda não enviou nenhum resultado.'
              : 'Nenhuma loja ativa no último resultado.'}
          </p>
        </Card>
      )}
      {lojas.length > 0 && lojasFiltradas.length === 0 && (
        <Card>
          <p className="text-center text-neutral-500 py-6">{vazioFiltro[filtro]}</p>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {lojasFiltradas.map((loja) => (
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
                  <span className="text-neutral-500 truncate">{resumoExecucao(e)}</span>
                  <span className="ml-auto text-xs text-neutral-400 whitespace-nowrap">
                    {e.origem === 'SOB_DEMANDA' ? 'Consultar agora' : 'Agendada'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
