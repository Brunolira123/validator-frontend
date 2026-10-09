import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Sparkles, Loader2, Edit3 } from 'lucide-react';
import { equipamentosApi } from '../api/equipamentos';
import { Button } from './Button';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { RevisaoAnaliseModal } from './RevisaoAnaliseModal';
import type { ErroResponse, ResultadoAnaliseDTO } from '../types/api';

interface Props {
  equipamentoId: number;
  temFoto: boolean;
  editavel: boolean;
}

export function AnaliseEquipamento({ equipamentoId, temFoto, editavel }: Props) {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  const [revisaoOpen, setRevisaoOpen] = useState(false);

  // Busca a análise existente (se houver) via endpoint de equipamento
  // Por enquanto, guarda o resultado em estado local após analisar
  const [resultado, setResultado] = useState<ResultadoAnaliseDTO | null>(null);

  const analisarMutation = useMutation({
    mutationFn: () => equipamentosApi.analisar(equipamentoId),
    onSuccess: (data) => {
      setResultado(data);
      setErro(null);
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      queryClient.invalidateQueries({ queryKey: ['equipamento', equipamentoId] });
    },
    onError: (e: AxiosError<ErroResponse>) => {
      const msg = e.response?.data?.mensagem;
      setErro(msg || 'Erro ao analisar equipamento');
    },
  });

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
      {!resultado && !analisarMutation.isPending && (
        <Button
          onClick={() => analisarMutation.mutate()}
          className="w-full"
        >
          <Sparkles size={16} />
          Analisar com IA
        </Button>
      )}

      {analisarMutation.isPending && (
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
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {erro}
        </div>
      )}

      {resultado && (
        <>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-500">Resultado</p>
                <div className="mt-1">
                  <StatusBadge status={resultado.resultado} />
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRevisaoOpen(true)}
              >
                <Edit3 size={14} />
                Revisar
              </Button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              {resultado.justificativa}
            </p>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              {resultado.itens.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {item.campo}
                    </p>
                    <p className="text-xs text-slate-500">
                      Encontrado: {item.valorEncontrado ?? '—'} · Requisito: {item.requisito}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.observacao}
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {revisaoOpen && resultado && (
        <RevisaoAnaliseModal
          equipamentoId={equipamentoId}
          onClose={() => setRevisaoOpen(false)}
          onSuccess={(novoResultado) => {
            setResultado(novoResultado);
            setRevisaoOpen(false);
            queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
          }}
        />
      )}
    </div>
  );
}