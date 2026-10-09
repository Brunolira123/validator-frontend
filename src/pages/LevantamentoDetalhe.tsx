import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Server, Monitor, HardDrive, ShoppingCart, AlertCircle } from 'lucide-react';
import { levantamentosApi } from '../api/levantamentos';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { StatusLevantamentoBadge } from '../components/StatusLevantamentoBadge';
import { EquipamentoDrawer } from '../components/EquipamentoDrawer';
import type { CategoriaEquipamento, FuncaoEquipamento, EquipamentoResponse } from '../types/api';

const categoriaIcon: Record<CategoriaEquipamento, typeof Server> = {
  SERVIDOR: Server,
  PDV: Monitor,
  RETAGUARDA: HardDrive,
  CONSULTA_PRECO: ShoppingCart,
  OUTRO: AlertCircle,
};

const funcaoLabel: Record<FuncaoEquipamento, string> = {
  BANCO_DADOS: 'Banco de Dados',
  APLICACAO: 'Aplicação',
  SERVICE_MANAGER: 'Service Manager',
  PDV: 'PDV',
  RETAGUARDA: 'Retaguarda',
  CONSULTA_PRECO: 'Consulta de Preço',
  OUTRO: 'Outro',
};

export default function LevantamentoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const levantamentoId = Number(id);
  const [equipamentoSelecionado, setEquipamentoSelecionado] =
    useState<EquipamentoResponse | null>(null);

  const { data: levantamento, isLoading: loadingLev } = useQuery({
    queryKey: ['levantamento', levantamentoId],
    queryFn: () => levantamentosApi.buscar(levantamentoId),
    enabled: !isNaN(levantamentoId),
  });

  const { data: equipamentos, isLoading: loadingEquip } = useQuery({
    queryKey: ['equipamentos', levantamentoId],
    queryFn: () => levantamentosApi.listarEquipamentos(levantamentoId),
    enabled: !isNaN(levantamentoId),
  });

  if (loadingLev) return <div className="p-8 text-slate-500">Carregando...</div>;
  if (!levantamento) return <div className="p-8 text-red-600">Levantamento não encontrado</div>;

  const total = equipamentos?.length ?? 0;
  const atende = equipamentos?.filter((e) => e.status === 'ATENDE').length ?? 0;
  const naoAtende = equipamentos?.filter((e) => e.status === 'NAO_ATENDE').length ?? 0;
  const requerAnalise = equipamentos?.filter((e) => e.status === 'REQUER_ANALISE').length ?? 0;

  return (
    <div className="p-8">
      <Link
        to={`/clientes/${levantamento.clienteId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para {levantamento.clienteRazaoSocial}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Levantamento #{levantamento.id}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {levantamento.clienteRazaoSocial} · Criado em{' '}
            {new Date(levantamento.criadoEm).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <StatusLevantamentoBadge status={levantamento.status} />
      </div>

      {/* Resumo do dimensionamento */}
      <Card className="mb-6">
        <h2 className="text-sm font-medium text-slate-500 mb-3">Dimensionamento</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-slate-900">{levantamento.qtdServidores}</p>
            <p className="text-xs text-slate-500">Servidor(es)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{levantamento.qtdPdvs}</p>
            <p className="text-xs text-slate-500">PDV(s)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{levantamento.qtdRetaguardas}</p>
            <p className="text-xs text-slate-500">Retaguarda(s)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {levantamento.consultaPreco ? levantamento.qtdConsultaPreco : 0}
            </p>
            <p className="text-xs text-slate-500">Consulta(s) de preço</p>
          </div>
        </div>
      </Card>

      {/* Resumo dos resultados */}
      {total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">🟢 Atende</p>
            <p className="text-2xl font-bold text-green-600">{atende}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">🔴 Não atende</p>
            <p className="text-2xl font-bold text-red-600">{naoAtende}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">🟡 Requer análise</p>
            <p className="text-2xl font-bold text-yellow-600">{requerAnalise}</p>
          </Card>
        </div>
      )}

      {/* Lista de equipamentos */}
      <h2 className="text-lg font-bold text-slate-900 mb-3">
        Equipamentos {total > 0 && `(${total})`}
      </h2>

      {loadingEquip && <p className="text-slate-500">Carregando...</p>}

      {equipamentos && equipamentos.length === 0 && (
        <Card>
          <p className="text-slate-500 text-center py-8">
            Nenhum equipamento gerado. Clique em "Gerar Equipamentos".
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {equipamentos?.map((e) => {
          const Icon = categoriaIcon[e.categoria];
          return (
            <Card key={e.id}>
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <Icon size={20} className="text-slate-700" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {e.categoria} {e.sequencia}
                  </p>
                  <p className="text-sm text-slate-500">
                    {funcaoLabel[e.funcao]}
                    {e.qtdFotos > 0 && ` · ${e.qtdFotos} foto(s)`}
                  </p>
                </div>
                <StatusBadge status={e.status} />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEquipamentoSelecionado(e)}
                >
                  Abrir
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <EquipamentoDrawer
        equipamento={equipamentoSelecionado}
        levantamentoId={levantamentoId}
        onClose={() => setEquipamentoSelecionado(null)}
      />
    </div>
  );
}