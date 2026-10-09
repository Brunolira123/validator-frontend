import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { X } from 'lucide-react';
import { levantamentosApi } from '../api/levantamentos';
import { Button } from './Button';
import { Input } from './Input';
import type { ErroResponse } from '../types/api';

const schema = z.object({
  qtdServidores: z.number().int().min(0),
  qtdPdvs: z.number().int().min(0),
  qtdRetaguardas: z.number().int().min(0),
  consultaPreco: z.boolean(),
  qtdConsultaPreco: z.number().int().min(0),
  outros: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  clienteId: number;
  onClose: () => void;
  onSuccess: (levantamentoId: number) => void;
}

export function NovoLevantamentoModal({ clienteId, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      qtdServidores: 1,
      qtdPdvs: 0,
      qtdRetaguardas: 0,
      consultaPreco: false,
      qtdConsultaPreco: 0,
    },
  });

  const consultaPreco = watch('consultaPreco');

  const criarMutation = useMutation({
    mutationFn: (data: FormData) =>
      levantamentosApi.criar({
        clienteId,
        qtdServidores: data.qtdServidores,
        qtdPdvs: data.qtdPdvs,
        qtdRetaguardas: data.qtdRetaguardas,
        consultaPreco: data.consultaPreco,
        qtdConsultaPreco: data.consultaPreco ? data.qtdConsultaPreco : 0,
        outros: data.outros,
      }),
    onSuccess: async (l) => {
      // Gera os equipamentos automaticamente
      try {
        await levantamentosApi.gerarEquipamentos(l.id);
      } catch (e) {
        // Se falhar, ainda navega pro levantamento
        console.error('Erro ao gerar equipamentos', e);
      }
      onSuccess(l.id);
    },
    onError: (e: AxiosError<ErroResponse>) => {
      alert(e.response?.data?.mensagem || 'Erro ao criar levantamento');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Novo Levantamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => criarMutation.mutate(d))} className="p-6 space-y-4">
          <p className="text-sm text-slate-500">
            Informe o dimensionamento do ambiente que será implantado.
          </p>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Servidores"
              type="number"
              min={0}
              error={errors.qtdServidores?.message}
              {...register('qtdServidores', { valueAsNumber: true })}
            />
            <Input
              label="PDVs"
              type="number"
              min={0}
              error={errors.qtdPdvs?.message}
              {...register('qtdPdvs', { valueAsNumber: true })}
            />
            <Input
              label="Retaguardas"
              type="number"
              min={0}
              error={errors.qtdRetaguardas?.message}
              {...register('qtdRetaguardas', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="consultaPreco"
              {...register('consultaPreco')}
              className="w-4 h-4 text-vr-900 border-slate-300 rounded focus:ring-vr-500"
            />
            <label htmlFor="consultaPreco" className="text-sm text-slate-700">
              Possui consulta de preço?
            </label>
          </div>

          {consultaPreco && (
            <Input
              label="Quantidade de consultas de preço"
              type="number"
              min={0}
              error={errors.qtdConsultaPreco?.message}
              {...register('qtdConsultaPreco', { valueAsNumber: true })}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Outros (opcional)
            </label>
            <textarea
              {...register('outros')}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
              placeholder="Informações adicionais..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || criarMutation.isPending}>
              Criar e Gerar Equipamentos
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}