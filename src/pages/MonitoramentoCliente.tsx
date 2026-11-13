import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, PowerOff } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { SituacaoMonitorBadge } from '../components/SituacaoMonitorBadge';
import { AbaVisaoGeral, type AbaCliente } from '../components/monitor/AbaVisaoGeral';
import { AbaVerificacoes } from '../components/monitor/AbaVerificacoes';
import { AbaAmbiente } from '../components/monitor/AbaAmbiente';
import { AbaAgente } from '../components/monitor/AbaAgente';
import { textoDesativacao } from '../components/monitor/textos';
import { useIsAdmin } from '../stores/authStore';
import { formatarCnpj, tempoDesde } from '../labels';

const todasAbas: { id: AbaCliente; label: string; soAdmin?: boolean }[] = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'verificacoes', label: 'Verificações' },
  { id: 'ambiente', label: 'Ambiente' },
  { id: 'agente', label: 'Agente', soAdmin: true },
];

/** Lista com inativos: a página também abre clientes desativados. Mesma consulta para qualquer cliente (cache). */
const FILTRO_TODOS = { inativos: true };

export default function MonitoramentoCliente() {
  const { id } = useParams<{ id: string }>();
  const clienteId = Number(id);
  const valido = Number.isInteger(clienteId) && clienteId > 0;
  const isAdmin = useIsAdmin();
  const [params, setParams] = useSearchParams();
  const { state } = useLocation() as { state: { lista?: string } | null };
  const voltarPara = `/monitoramento${state?.lista ?? ''}`;

  const abas = todasAbas.filter((a) => !a.soAdmin || isAdmin);
  const abaParam = params.get('aba');
  const aba: AbaCliente = abas.find((a) => a.id === abaParam)?.id ?? 'visao';
  const irPara = (nova: AbaCliente) =>
    setParams(
      (p) => {
        const novo = new URLSearchParams(p);
        if (nova === 'visao') novo.delete('aba');
        else novo.set('aba', nova);
        return novo;
      },
      { replace: true, state },
    );

  const { data: detalhe, isLoading, error } = useQuery({
    queryKey: ['monitor', 'cliente', clienteId],
    queryFn: () => monitorApi.detalhar(clienteId),
    enabled: valido,
    refetchInterval: 60_000,
  });

  // O backend não tem o item da lista por id: a lista única traz hoje, ambiente resumido e desativação
  const { data: item, isLoading: carregandoItem } = useQuery({
    queryKey: ['monitor', 'clientes', FILTRO_TODOS],
    queryFn: () => monitorApi.listar(FILTRO_TODOS),
    enabled: valido,
    refetchInterval: 60_000,
    select: (lista) => lista.find((c) => c.id === clienteId),
  });

  // Containers, updater e última atualização: só na lista do Suporte (só ativos)
  const { data: suporte, isLoading: carregandoSuporte } = useQuery({
    queryKey: ['monitor', 'suporte', 'clientes'],
    queryFn: monitorApi.suporteClientes,
    enabled: valido,
    refetchInterval: 60_000,
    select: (lista) => lista.find((c) => c.id === clienteId),
  });

  const { data: historico } = useQuery({
    queryKey: ['monitor', 'historico', clienteId],
    queryFn: () => monitorApi.historico(clienteId),
    enabled: valido,
  });

  if (isLoading || carregandoItem) return <p className="text-neutral-500">Carregando...</p>;
  if (!detalhe || !item) {
    return (
      <div className="space-y-4">
        <ErrorAlert>{error ? mensagemErro(error, 'Erro ao carregar o cliente') : 'Cliente não encontrado'}</ErrorAlert>
        <Link to={voltarPara} className="inline-flex items-center gap-2 text-sm text-vr-700 font-medium hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para a lista
        </Link>
      </div>
    );
  }

  const cliente = detalhe.cliente;

  return (
    <div>
      <Link
        to={voltarPara}
        className="inline-flex items-center gap-2 min-h-11 md:min-h-0 text-sm text-neutral-500 hover:text-neutral-700 mb-4 md:mb-5"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar para a lista
      </Link>

      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 break-words min-w-0">{cliente.nome}</h1>
          <SituacaoMonitorBadge situacao={cliente.situacao} />
        </div>
        <p className="text-sm text-neutral-500 mt-1">
          {[
            cliente.cnpj && formatarCnpj(cliente.cnpj),
            cliente.ultimoContato ? `Último contato ${tempoDesde(cliente.ultimoContato)}` : 'Agente nunca se conectou',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {!cliente.ativo && (
        <Card className="mb-4 !bg-neutral-50">
          <p className="flex items-start gap-2 text-sm text-neutral-600">
            <PowerOff size={16} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
            <span className="min-w-0 break-words">
              {textoDesativacao(item)}
              {item.desativacao?.motivo && <> · {item.desativacao.motivo}</>}. O histórico continua disponível.
            </span>
          </p>
        </Card>
      )}

      {/* Abas: rolam na horizontal no celular */}
      <div role="tablist" aria-label="Seções do cliente" className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4 flex gap-2 overflow-x-auto pb-1">
        {abas.map((a) => (
          <button
            key={a.id}
            role="tab"
            type="button"
            aria-selected={aba === a.id}
            onClick={() => irPara(a.id)}
            className={`shrink-0 min-h-11 md:min-h-10 px-4 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
              aba === a.id ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={abas.find((a) => a.id === aba)?.label}>
        {aba === 'visao' && (
          <AbaVisaoGeral
            cliente={item}
            suporte={suporte}
            historico={historico}
            abas={abas.map((a) => a.id)}
            onIrPara={irPara}
          />
        )}
        {aba === 'verificacoes' && <AbaVerificacoes detalhe={detalhe} historico={historico} />}
        {aba === 'ambiente' &&
          (carregandoSuporte ? <p className="text-neutral-500">Carregando...</p> : <AbaAmbiente cliente={suporte} />)}
        {aba === 'agente' && isAdmin && <AbaAgente cliente={item} suporte={suporte} />}
      </div>
    </div>
  );
}
