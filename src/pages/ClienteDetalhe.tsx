import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Plus, Building2 } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { mensagemErro } from '../api/erro';
import { levantamentosApi } from '../api/levantamentos';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { NovoLevantamentoModal } from '../components/NovoLevantamentoModal';
import { StatusLevantamentoBadge } from '../components/StatusLevantamentoBadge';
import { ErrorAlert } from '../components/ErrorAlert';
import { BotaoExcluir, ConfirmarExclusao } from '../components/ConfirmarExclusao';
import { useIsAdmin } from '../stores/authStore';
import { formatarCnpj } from '../labels';
import type { ClienteResponse, LevantamentoResponse } from '../types/api';

type Exclusao = { tipo: 'cliente' } | { tipo: 'levantamento'; levantamento: LevantamentoResponse };

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const clienteId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [exclusao, setExclusao] = useState<Exclusao | null>(null);
  // Depois de excluir o cliente, desliga as queries até a navegação (senão refaz GET e toma 404)
  const [saindo, setSaindo] = useState(false);
  const isAdmin = useIsAdmin();

  const { data: cliente, isLoading: loadingCliente, error: erroCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => clientesApi.buscar(clienteId),
    enabled: !isNaN(clienteId) && !saindo,
  });

  const { data: levantamentos, isLoading: loadingLev, error: erroLev } = useQuery({
    queryKey: ['levantamentos', clienteId],
    queryFn: () => levantamentosApi.listarPorCliente(clienteId),
    enabled: !isNaN(clienteId) && !saindo,
  });

  const excluirMutation = useMutation({
    mutationFn: (alvo: Exclusao) =>
      alvo.tipo === 'cliente'
        ? clientesApi.excluir(clienteId)
        : levantamentosApi.excluir(alvo.levantamento.id),
    onSuccess: async (_, alvo) => {
      setExclusao(null);
      if (alvo.tipo === 'cliente') {
        setSaindo(true);
        queryClient.setQueryData<ClienteResponse[]>(['clientes'], (lista) =>
          lista?.filter((c) => c.id !== clienteId)
        );
        queryClient.removeQueries({ queryKey: ['cliente', clienteId] });
        queryClient.removeQueries({ queryKey: ['levantamentos', clienteId] });
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
        navigate('/', { replace: true });
      } else {
        queryClient.setQueryData<LevantamentoResponse[]>(['levantamentos', clienteId], (lista) =>
          lista?.filter((l) => l.id !== alvo.levantamento.id)
        );
        await queryClient.invalidateQueries({ queryKey: ['levantamentos', clienteId] });
      }
    },
  });

  const fecharExclusao = () => {
    setExclusao(null);
    excluirMutation.reset();
  };

  if (loadingCliente) return <p className="text-neutral-500">Carregando...</p>;
  if (!cliente) {
    return (
      <div className="space-y-4">
        <ErrorAlert>
          {erroCliente ? mensagemErro(erroCliente, 'Erro ao carregar cliente') : 'Cliente não encontrado'}
        </ErrorAlert>
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-vr-700 font-medium hover:underline">
          <ArrowLeft size={16} />
          Voltar para clientes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 min-h-11 md:min-h-0 text-sm text-neutral-500 hover:text-neutral-700 mb-4 md:mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para clientes
      </Link>

      <Card className="mb-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:block bg-vr-50 p-3 rounded-lg">
            <Building2 size={24} className="text-vr-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-neutral-900 break-words">{cliente.razaoSocial}</h1>
            {cliente.nomeFantasia && (
              <p className="text-sm text-neutral-500">{cliente.nomeFantasia}</p>
            )}
            <p className="text-sm text-neutral-500 mt-2 tabular-nums">CNPJ: {formatarCnpj(cliente.cnpj)}</p>
            {(cliente.cidade || cliente.uf) && (
              <p className="text-sm text-neutral-500">
                {cliente.cidade} {cliente.uf && `- ${cliente.uf}`}
              </p>
            )}
            {cliente.telefone && (
              <p className="text-sm text-neutral-500">Tel: {cliente.telefone}</p>
            )}
          </div>
          {isAdmin && (
            <div className="-mr-2 -mt-2">
              <BotaoExcluir rotulo="Excluir cliente" onClick={() => setExclusao({ tipo: 'cliente' })} />
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-neutral-900">Levantamentos</h2>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Novo Levantamento
        </Button>
      </div>

      {loadingLev && <p className="text-neutral-500">Carregando...</p>}

      {erroLev && <ErrorAlert>{mensagemErro(erroLev, 'Erro ao carregar levantamentos')}</ErrorAlert>}

      {levantamentos && levantamentos.length === 0 && (
        <Card>
          <p className="text-neutral-500 text-center py-8">
            Nenhum levantamento criado ainda.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {levantamentos?.map((l) => (
          <Card
            key={l.id}
            interativo
            onClick={() => navigate(`/levantamentos/${l.id}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">
                  Levantamento #{l.id}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  {l.qtdServidores} servidor(es) · {l.qtdPdvs} PDV(s) · {l.qtdRetaguardas} retaguarda(s)
                  {l.consultaPreco && ` · ${l.qtdConsultaPreco} consulta(s) de preço`}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Criado em {new Date(l.criadoEm).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1 -my-1">
                <StatusLevantamentoBadge status={l.status} />
                {isAdmin && (
                  <div className="-mr-2">
                    <BotaoExcluir
                      rotulo={`Excluir levantamento #${l.id}`}
                      onClick={() => setExclusao({ tipo: 'levantamento', levantamento: l })}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modalOpen && (
        <NovoLevantamentoModal
          clienteId={clienteId}
          onClose={() => setModalOpen(false)}
          onSuccess={(levantamentoId) => {
            queryClient.invalidateQueries({ queryKey: ['levantamentos', clienteId] });
            setModalOpen(false);
            navigate(`/levantamentos/${levantamentoId}`);
          }}
        />
      )}

      {exclusao && (
        <ConfirmarExclusao
          titulo={exclusao.tipo === 'cliente' ? 'Excluir cliente?' : `Excluir levantamento #${exclusao.levantamento.id}?`}
          excluindo={excluirMutation.isPending}
          erro={excluirMutation.error ? mensagemErro(excluirMutation.error, 'Erro ao excluir') : null}
          onConfirmar={() => excluirMutation.mutate(exclusao)}
          onCancelar={fecharExclusao}
        >
          {exclusao.tipo === 'cliente' ? (
            <p>
              <strong className="text-neutral-900">{cliente.razaoSocial}</strong> e todos os
              levantamentos dele vão sumir da lista.
            </p>
          ) : (
            <p>O levantamento, com equipamentos, fotos e análises, vai sumir da lista deste cliente.</p>
          )}
        </ConfirmarExclusao>
      )}
    </div>
  );
}