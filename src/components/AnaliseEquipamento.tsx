import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Sparkles, Loader2, Edit3, RefreshCw, User, Clock } from 'lucide-react';
import { equipamentosApi } from '../api/equipamentos';
import { Button } from './Button';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { RevisaoAnaliseModal } from './RevisaoAnaliseModal';
import type { ErroResponse } from '../types/api';

interface Props {
  equipamentoId: number;
  temFoto: boolean;
  editavel: boolean;
}

export function AnaliseEquipamento({ equipamentoId, temFoto, editavel }: Props) {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [revisaoOpen, setRevisaoOpen] = useState(false);

  const { data: analise, isLoading } = useQuery({
    queryKey: ['analise', equipamentoId],
    queryFn: () => equipamentosApi.buscarAnalise(equipamentoId),
    enabled: !!equipamentoId,
  });

  const analisarMutation = useMutation({
    mutationFn: () => equipamentosApi.analisar(equipamentoId),
    onSuccess: async () => {
      setErro(null);
      await queryClient.invalidateQueries({ queryKey: ['analise', equipamentoId] });
      await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      await queryClient.invalidateQueries({ queryKey: ['equipamento', equipamentoId] });
    },
    onError: (e: AxiosError<ErroResponse>) => {
      const msg = e.response?.data?.mensagem;
      setErro(msg || 'Erro ao analisar equipamento');
    },
  });

  const handleReanalisar = () => {
    const aviso = analise?.revisada
      ? 'Reanalisar vai descartar as correções feitas pelo técnico. Continuar?'
      : 'Reanalisar consome quota de IA. Continuar?';
    if (!window.confirm(aviso)) return;
    analisarMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Carregando análise...</span>
        </div>
      </Card>
    );
  }

  if (!analise) {
    if (!temFoto) {
      return (
        <Card>
          <p className="text-sm text-slate-500">
            Envie pelo menos uma foto antes de analisar.
          </p>
        </Card>
      );
    }

    if (!editavel) {
      return (
        <Card>
          <p className="text-sm text-slate-500">
            Levantamento não está editável. Não é possível analisar.
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {analisarMutation.isPending ? (
          <Card>
            <div className="flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-vr-900" />
              <div>
                <p className="font-medium text-slate-900">Analisando...</p>
                <p className="text-xs text-slate-500">
                  A IA está lendo a foto. Isso pode levar alguns segundos.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Button onClick={() => analisarMutation.mutate()} className="w-full">
            <Sparkles size={16} />
            Analisar com IA
          </Button>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {erro}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500">Resultado</p>
            <div className="mt-1">
              <StatusBadge status={analise.resultado} />
            </div>
          </div>
          {editavel && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRevisaoOpen(true)}
              >
                <Edit3 size={14} />
                Revisar
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReanalisar}
                loading={analisarMutation.isPending}
              >
                <RefreshCw size={14} />
              </Button>
            </div>
          )}
        </div>

        {analise.revisada && (
          <div className="mb-3 inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
            <Edit3 size={12} />
            Revisada por técnico
          </div>
        )}

        <p className="text-sm text-slate-600 mb-4">{analise.justificativa}</p>

        {analise.itens.length > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            {analise.itens.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.campo}</p>
                  <p className="text-xs text-slate-500">
                    Encontrado: {item.valorEncontrado ?? '—'} · Requisito: {item.requisito}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.observacao}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}

        {analise.itens.length === 0 && (
          <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
            Análise feita antes da atualização. Reanalise para ver os detalhes.
          </p>
        )}

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
          {analise.analisadoPorNome && (
            <span className="inline-flex items-center gap-1">
              <User size={12} />
              {analise.analisadoPorNome}
            </span>
          )}
          {analise.analisadoEm && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {new Date(analise.analisadoEm).toLocaleString('pt-BR')}
            </span>
          )}
          {analise.confiancaGlobal != null && (
            <span>Confiança: {Math.round(analise.confiancaGlobal * 100)}%</span>
          )}
        </div>
      </Card>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {erro}
        </div>
      )}

      {revisaoOpen && (
        <RevisaoAnaliseModal
          equipamentoId={equipamentoId}
          analiseAtual={analise}
          onClose={() => setRevisaoOpen(false)}
          onSuccess={async () => {
            setRevisaoOpen(false);
            await queryClient.invalidateQueries({ queryKey: ['analise', equipamentoId] });
            await queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
          }}
        />
      )}
    </div>
  );
}