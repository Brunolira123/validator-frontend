import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Copy, Download, Info, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { ErrorAlert } from './ErrorAlert';
import type { PedidoLog } from '../types/api';

const opcoesLinhas = [100, 200, 500] as const;

const aguardando = (p?: PedidoLog) => !p || p.status === 'PENDENTE' || p.status === 'ENTREGUE';

/** 75 → "1 min 15 s" */
function duracao(segundos: number) {
  if (segundos < 60) return `${segundos} s`;
  return `${Math.floor(segundos / 60)} min ${segundos % 60} s`;
}

/** Fora de HTTPS o navigator.clipboard não existe: cai no execCommand. */
async function copiarTexto(texto: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

function baixarTexto(texto: string, nomeArquivo: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

/** "Mercado São José" → "mercado-sao-jose" */
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

interface Props {
  clienteId: number;
  clienteNome: string;
  container: string;
  onVoltar: () => void;
}

/** Últimas N linhas do log de um container, pedidas ao agente e acompanhadas até chegarem. */
export function LogContainerPainel({ clienteId, clienteNome, container, onVoltar }: Props) {
  const [linhas, setLinhas] = useState<number>(100);
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const [inicio, setInicio] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  const [copiado, setCopiado] = useState(false);
  const [erroCopia, setErroCopia] = useState(false);

  const pedir = useMutation({
    mutationFn: (n: number) => monitorApi.pedirLog(clienteId, container, n),
    onMutate: () => {
      setPedidoId(null);
      setInicio(Date.now());
      setAgora(Date.now());
      setCopiado(false);
    },
    onSuccess: (p) => setPedidoId(p.pedidoId),
  });
  const { mutate } = pedir;

  // Abre já pedindo. O ref segura o StrictMode, que roda o efeito duas vezes em dev
  const pediuAoAbrir = useRef(false);
  useEffect(() => {
    if (pediuAoAbrir.current) return;
    pediuAoAbrir.current = true;
    mutate(100);
  }, [mutate]);

  // Cada troca de quantidade é um pedido novo
  const trocarLinhas = (n: number) => {
    setLinhas(n);
    mutate(n);
  };

  const { data: pedido, error: erroPolling } = useQuery({
    queryKey: ['monitor', 'suporte', 'log', clienteId, container, pedidoId],
    queryFn: () => monitorApi.pedidoLog(clienteId, container, pedidoId!),
    enabled: pedidoId != null,
    refetchInterval: (query) => (aguardando(query.state.data) ? 3_000 : false),
  });

  const esperando = pedir.isPending || (pedidoId != null && aguardando(pedido) && !erroPolling);

  // Relógio do "Aguardando o agente…": conta a partir do clique, sem depender do relógio do servidor
  useEffect(() => {
    if (!esperando) return;
    const t = setInterval(() => setAgora(Date.now()), 1_000);
    return () => clearInterval(t);
  }, [esperando]);

  const decorrido = Math.max(0, Math.floor((agora - inicio) / 1_000));
  // Containers com TTY mandam CRLF: sem normalizar, o CR sobra no copiar/baixar e em alguns visualizadores
  const log = pedido?.status === 'CONCLUIDO' && pedido.texto != null ? pedido.texto.replace(/\r\n?/g, '\n') : null;
  const apagado = pedido?.status === 'CONCLUIDO' && pedido.texto == null && !!pedido.textoApagadoEm;

  // Log termina no mais recente: abre rolado até o fim
  const caixaLog = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (log != null && caixaLog.current) caixaLog.current.scrollTop = caixaLog.current.scrollHeight;
  }, [log]);

  const copiar = async () => {
    if (log == null) return;
    try {
      await copiarTexto(log);
      setErroCopia(false);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2_000);
    } catch {
      setErroCopia(true);
    }
  };

  const baixar = () => {
    if (log == null) return;
    const quando = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    baixarTexto(log, `${slug(clienteNome)}-${slug(container)}-${quando}.txt`);
  };

  const botaoSecundario =
    'inline-flex items-center justify-center gap-1.5 min-h-11 md:min-h-9 px-3 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onVoltar}
          className="-ml-2 inline-flex items-center gap-1.5 min-h-11 md:min-h-9 px-2 rounded-md text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 shrink-0"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </button>
        <h3 className="min-w-0 truncate font-mono text-sm font-semibold text-neutral-900" title={container}>
          {container}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Quantidade de linhas" className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5">
          {opcoesLinhas.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={linhas === n}
              disabled={esperando}
              onClick={() => trocarLinhas(n)}
              className={`min-h-10 md:min-h-0 px-3 py-1.5 text-sm font-medium rounded-md tabular-nums transition-colors disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
                linhas === n ? 'bg-vr-600 text-white' : 'text-neutral-600 hover:bg-neutral-100 disabled:opacity-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-xs text-neutral-500">linhas</span>
        <button type="button" onClick={() => mutate(linhas)} disabled={esperando} className={`${botaoSecundario} ml-auto`}>
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-neutral-500">
        <ShieldAlert size={14} className="shrink-0" aria-hidden="true" />
        Pode conter dados sensíveis. Não compartilhe.
      </p>

      {pedir.error && <ErrorAlert>{mensagemErro(pedir.error, 'Erro ao pedir o log')}</ErrorAlert>}
      {erroPolling && <ErrorAlert>{mensagemErro(erroPolling, 'Erro ao acompanhar o pedido de log')}</ErrorAlert>}

      {esperando && (
        <div role="status" className="flex items-center gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-6 text-sm text-neutral-600">
          <Loader2 size={16} className="animate-spin shrink-0 text-vr-600" aria-hidden="true" />
          <span>
            Aguardando o agente… <span className="tabular-nums text-neutral-400">{duracao(decorrido)}</span>
          </span>
        </div>
      )}

      {pedido?.status === 'ERRO' && <ErrorAlert>{pedido.erro || 'O agente não conseguiu ler o log.'}</ErrorAlert>}

      {pedido?.status === 'EXPIRADO' && (
        <ErrorAlert>O agente não respondeu a tempo. Confira se ele está online e clique em "Atualizar".</ErrorAlert>
      )}

      {apagado && (
        <p className="flex items-start gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm text-neutral-600">
          <Info size={16} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
          Log apagado após 1h; peça de novo.
        </p>
      )}

      {log != null && (
        <>
          {pedido?.truncado && (
            <p className="flex items-start gap-2 text-xs text-amber-700">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Mostrando só o fim do log (limite de 256 KB)
            </p>
          )}
          <pre
            ref={caixaLog}
            tabIndex={0}
            aria-label={`Log de ${container}`}
            className="max-h-[60dvh] sm:max-h-[50vh] overflow-y-auto rounded-lg bg-neutral-950 p-3 font-mono text-xs leading-relaxed text-neutral-100 whitespace-pre-wrap [overflow-wrap:anywhere] focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
          >
            {log || '(log vazio)'}
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copiar} className={botaoSecundario}>
              {copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <button type="button" onClick={baixar} className={botaoSecundario}>
              <Download size={16} aria-hidden="true" />
              Baixar .txt
            </button>
            {erroCopia && <span className="text-xs text-red-600">Não deu para copiar. Use "Baixar .txt".</span>}
          </div>
        </>
      )}
    </div>
  );
}
