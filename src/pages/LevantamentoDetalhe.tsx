import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Server, Monitor, HardDrive, ShoppingCart, AlertCircle, ChevronRight, Wand2,
} from 'lucide-react';
import { levantamentosApi } from '../api/levantamentos';
import { mensagemErro } from '../api/erro';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ErrorAlert } from '../components/ErrorAlert';
import { StatusBadge } from '../components/StatusBadge';
import { StatusLevantamentoBadge } from '../components/StatusLevantamentoBadge';
import { EquipamentoDrawer } from '../components/EquipamentoDrawer';
import { BotaoExcluir, ConfirmarExclusao } from '../components/ConfirmarExclusao';
import { useIsAdmin } from '../stores/authStore';
import { funcaoLabel } from '../labels';
import type { CategoriaEquipamento, EquipamentoResponse, LevantamentoResponse } from '../types/api';

const categoriaIcon: Record<CategoriaEquipamento, typeof Server> = {
  SERVIDOR: Server,
  PDV: Monitor,
  RETAGUARDA: HardDrive,
  CONSULTA_PRECO: ShoppingCart,
  OUTRO: AlertCircle,
};

export default function LevantamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const levantamentoId = Number(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  // Depois de excluir, a página só existe até a navegação: desliga as queries pra não refazer GET (404)
  const [saindo, setSaindo] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoResponse | null>(null);

  const { data: levantamento, isLoading: loadingLev, error: erroLev } = useQuery({
    queryKey: ['levantamento', levantamentoId],
    queryFn: () => levantamentosApi.buscar(levantamentoId),
    enabled: !isNaN(levantamentoId) && !saindo,
  });

  const { data: equipamentos, isLoading: loadingEquip, error: erroEquip } = useQuery({
    queryKey: ['equipamentos', levantamentoId],
    queryFn: () => levantamentosApi.listarEquipamentos(levantamentoId),
    enabled: !isNaN(levantamentoId) && !saindo,
  });

  const gerarMutation = useMutation({
    mutationFn: () => levantamentosApi.gerarEquipamentos(levantamentoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['levantamento', levantamentoId] });
      queryClient.invalidateQueries({ queryKey: ['equipamentos', levantamentoId] });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: () => levantamentosApi.excluir(levantamentoId),
    onSuccess: async () => {
      const clienteId = levantamento?.clienteId;
      setSaindo(true);
      setConfirmarExclusao(false);
      // Tira da lista do cliente já no cache: sem isso ele reaparece até o refetch terminar
      queryClient.setQueryData<LevantamentoResponse[]>(['levantamentos', clienteId], (lista) =>
        lista?.filter((l) => l.id !== levantamentoId)
      );
      queryClient.removeQueries({ queryKey: ['levantamento', levantamentoId] });
      queryClient.removeQueries({ queryKey: ['equipamentos', levantamentoId] });
      queryClient.invalidateQueries({ queryKey: ['levantamentos', clienteId] });
      navigate(clienteId ? `/clientes/${clienteId}` : '/', { replace: true });
    },
  });

  if (loadingLev) return <p className="text-neutral-500">Carregando...</p>;
  if (!levantamento) {
    return (
      <ErrorAlert>
        {erroLev ? mensagemErro(erroLev, 'Erro ao carregar levantamento') : 'Levantamento não encontrado'}
      </ErrorAlert>
    );
  }

  const editavel = levantamento.status === 'RASCUNHO' || levantamento.status === 'EM_ANALISE';
  const total = equipamentos?.length ?? 0;
  const atende = equipamentos?.filter((e) => e.status === 'ATENDE').length ?? 0;
  const naoAtende = equipamentos?.filter((e) => e.status === 'NAO_ATENDE').length ?? 0;
  const requerAnalise = equipamentos?.filter((e) => e.status === 'REQUER_ANALISE').length ?? 0;

  return (
    <div>
      <Link
        to={`/clientes/${levantamento.clienteId}`}
        className="inline-flex items-center gap-2 min-h-11 md:min-h-0 max-w-full text-sm text-neutral-500 hover:text-neutral-700 mb-4 md:mb-6"
      >
        <ArrowLeft size={16} className="shrink-0" />
        <span className="truncate">Voltar para {levantamento.clienteRazaoSocial}</span>
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-neutral-900">
            Levantamento #{levantamento.id}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {levantamento.clienteRazaoSocial} · Criado em{' '}
            {new Date(levantamento.criadoEm).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <StatusLevantamentoBadge status={levantamento.status} />
          {isAdmin && (
            <div className="-mr-2">
              <BotaoExcluir rotulo="Excluir levantamento" onClick={() => setConfirmarExclusao(true)} />
            </div>
          )}
        </div>
      </div>

      {/* Resumo do dimensionamento */}
      <Card className="mb-6">
        <h2 className="text-sm font-medium text-neutral-500 mb-3">Dimensionamento</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-neutral-900">{levantamento.qtdServidores}</p>
            <p className="text-xs text-neutral-500">Servidor(es)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{levantamento.qtdPdvs}</p>
            <p className="text-xs text-neutral-500">PDV(s)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{levantamento.qtdRetaguardas}</p>
            <p className="text-xs text-neutral-500">Retaguarda(s)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">
              {levantamento.consultaPreco ? levantamento.qtdConsultaPreco : 0}
            </p>
            <p className="text-xs text-neutral-500">Consulta(s) de preço</p>
          </div>
        </div>
      </Card>

      {/* Resumo dos resultados */}
      {total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card>
            <p className="text-xs text-neutral-500">Total</p>
            <p className="text-2xl font-bold text-neutral-900">{total}</p>
          </Card>
          <Card>
            <p className="text-xs text-neutral-500">🟢 Atende</p>
            <p className="text-2xl font-bold text-green-600">{atende}</p>
          </Card>
          <Card>
            <p className="text-xs text-neutral-500">🔴 Não atende</p>
            <p className="text-2xl font-bold text-red-600">{naoAtende}</p>
          </Card>
          <Card>
            <p className="text-xs text-neutral-500">🟡 Requer análise</p>
            <p className="text-2xl font-bold text-yellow-600">{requerAnalise}</p>
          </Card>
        </div>
      )}

      {/* Lista de equipamentos */}
      <h2 className="text-lg font-bold text-neutral-900 mb-3">
        Equipamentos {total > 0 && `(${total})`}
      </h2>

      {loadingEquip && <p className="text-neutral-500">Carregando...</p>}

      {erroEquip && (
        <ErrorAlert>{mensagemErro(erroEquip, 'Erro ao carregar equipamentos')}</ErrorAlert>
      )}

      {equipamentos && equipamentos.length === 0 && (
        <Card>
          <div className="text-center py-6 space-y-4">
            <p className="text-neutral-500">Nenhum equipamento gerado.</p>
            {editavel && (
              <Button onClick={() => gerarMutation.mutate()} loading={gerarMutation.isPending}>
                <Wand2 size={16} />
                Gerar equipamentos
              </Button>
            )}
            {gerarMutation.error && (
              <ErrorAlert>{mensagemErro(gerarMutation.error, 'Erro ao gerar equipamentos')}</ErrorAlert>
            )}
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {equipamentos?.map((e) => {
          const Icon = categoriaIcon[e.categoria];
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => setEquipamentoSelecionado(e)}
              className="block w-full text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
            >
              <Card interativo>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="bg-neutral-50 p-2.5 sm:p-3 rounded-lg shrink-0">
                    <Icon size={20} className="text-neutral-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900">
                      {e.categoria} {e.sequencia}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {funcaoLabel[e.funcao]}
                      {e.qtdFotos > 0 && ` · ${e.qtdFotos} foto(s)`}
                    </p>
                    <div className="mt-2 sm:hidden">
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                  <div className="hidden sm:block shrink-0">
                    <StatusBadge status={e.status} />
                  </div>
                  <ChevronRight size={20} className="text-neutral-400 shrink-0" />
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {confirmarExclusao && (
        <ConfirmarExclusao
          titulo={`Excluir levantamento #${levantamento.id}?`}
          excluindo={excluirMutation.isPending}
          erro={excluirMutation.error ? mensagemErro(excluirMutation.error, 'Erro ao excluir levantamento') : null}
          onConfirmar={() => excluirMutation.mutate()}
          onCancelar={() => {
            setConfirmarExclusao(false);
            excluirMutation.reset();
          }}
        >
          <p>O levantamento, com equipamentos, fotos e análises, vai sumir da lista deste cliente.</p>
        </ConfirmarExclusao>
      )}

      <EquipamentoDrawer
        equipamento={equipamentoSelecionado}
        levantamentoId={levantamentoId}
        onClose={() => setEquipamentoSelecionado(null)}
      />
    </div>
  );
}
