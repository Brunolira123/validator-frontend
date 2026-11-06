import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, RotateCw } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';
import { AguardandoAgente } from './AguardandoAgente';
import { toast } from '../stores/toastStore';
import type { PedidoAcao, TipoAcaoContainer } from '../types/api';

const aguardando = (p?: PedidoAcao) => !p || p.status === 'PENDENTE' || p.status === 'ENTREGUE';

const textos: Record<TipoAcaoContainer, { verbo: string; botao: string; sucesso: string; aviso: string }> = {
  START: {
    verbo: 'Iniciar',
    botao: 'Iniciar',
    sucesso: 'iniciado',
    aviso: 'O agente roda "docker start" no servidor do cliente.',
  },
  RESTART: {
    verbo: 'Reiniciar',
    botao: 'Reiniciar',
    sucesso: 'reiniciado',
    aviso: 'O agente roda "docker restart": o container fica fora do ar por alguns segundos.',
  },
};

interface Props {
  clienteId: number;
  clienteNome: string;
  container: string;
  tipo: TipoAcaoContainer;
  onVoltar: () => void;
}

/** Confirma, pede o START/RESTART ao agente e acompanha até ele responder. */
export function AcaoContainerPainel({ clienteId, clienteNome, container, tipo, onVoltar }: Props) {
  const queryClient = useQueryClient();
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const [inicio, setInicio] = useState(() => Date.now());
  const t = textos[tipo];

  const pedir = useMutation({
    mutationFn: () => monitorApi.pedirAcao(clienteId, container, tipo),
    onMutate: () => {
      setPedidoId(null);
      setInicio(Date.now());
    },
    onSuccess: (p) => setPedidoId(p.pedidoId),
  });

  const { data: pedido, error: erroPolling } = useQuery({
    queryKey: ['monitor', 'suporte', 'acao', clienteId, container, pedidoId],
    queryFn: () => monitorApi.pedidoAcao(clienteId, container, pedidoId!),
    enabled: pedidoId != null,
    refetchInterval: (query) => (aguardando(query.state.data) ? 3_000 : false),
  });

  const esperando = pedir.isPending || (pedidoId != null && aguardando(pedido) && !erroPolling);
  const confirmando = !pedir.isPending && pedidoId == null && !pedir.error;

  // Concluiu: avisa, recarrega a lista (o agente manda a foto nova do ambiente logo depois) e volta para a tabela
  const avisou = useRef(false);
  useEffect(() => {
    if (pedido?.status !== 'CONCLUIDO' || avisou.current) return;
    avisou.current = true;
    toast(`${container} ${t.sucesso} em ${clienteNome}.`);
    queryClient.invalidateQueries({ queryKey: ['monitor', 'suporte', 'clientes'] });
    onVoltar();
  }, [pedido?.status, container, clienteNome, t.sucesso, queryClient, onVoltar]);

  const tentarDeNovo = () => {
    avisou.current = false;
    pedir.reset();
    pedir.mutate();
  };

  const Icone = tipo === 'START' ? Play : RotateCw;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onVoltar}
        disabled={esperando}
        className="-ml-2 self-start inline-flex items-center gap-1.5 min-h-11 md:min-h-9 px-2 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar
      </button>

      <div>
        <h3 className="text-base font-semibold text-neutral-900">
          {t.verbo} o container <span className="font-mono break-all">{container}</span> do cliente{' '}
          <span className="break-words">{clienteNome}</span>?
        </h3>
        <p className="mt-1 text-sm text-neutral-500">{t.aviso}</p>
      </div>

      {confirmando && (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={onVoltar}>
            Cancelar
          </Button>
          <Button onClick={() => pedir.mutate()}>
            <Icone size={16} aria-hidden="true" />
            {t.botao}
          </Button>
        </div>
      )}

      {esperando && <AguardandoAgente inicio={inicio} />}

      {pedir.error && <ErrorAlert>{mensagemErro(pedir.error, `Erro ao pedir para ${t.verbo.toLowerCase()} o container`)}</ErrorAlert>}
      {erroPolling && <ErrorAlert>{mensagemErro(erroPolling, 'Erro ao acompanhar o pedido')}</ErrorAlert>}
      {pedido?.status === 'ERRO' && <ErrorAlert>{pedido.erro || 'O agente não conseguiu executar a ação.'}</ErrorAlert>}
      {pedido?.status === 'EXPIRADO' && (
        <ErrorAlert>O agente não respondeu a tempo. Confira se ele está online e tente de novo.</ErrorAlert>
      )}

      {!esperando && !confirmando && pedido?.status !== 'CONCLUIDO' && (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={onVoltar}>
            Voltar
          </Button>
          <Button onClick={tentarDeNovo}>
            <Icone size={16} aria-hidden="true" />
            Tentar de novo
          </Button>
        </div>
      )}
    </div>
  );
}
