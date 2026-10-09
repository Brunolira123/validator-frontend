import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { X } from 'lucide-react';
import { equipamentosApi } from '../api/equipamentos';
import { Button } from './Button';
import { Input } from './Input';
import type{ ErroResponse, ResultadoAnaliseDTO } from '../types/api';

const schema = z.object({
  fabricante: z.string().optional(),
  modelo: z.string().optional(),
  cpuFabricante: z.string().optional(),
  cpuModelo: z.string().optional(),
  cpuGeracao: z.union([z.number().int(), z.nan()]).optional(),
  cpuCores: z.union([z.number().int(), z.nan()]).optional(),
  cpuThreads: z.union([z.number().int(), z.nan()]).optional(),
  ramGb: z.union([z.number().int(), z.nan()]).optional(),
  armazenamentoTipo: z.string().optional(),
  armazenamentoGb: z.union([z.number().int(), z.nan()]).optional(),
  soNome: z.string().optional(),
  soVersao: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  equipamentoId: number;
  onClose: () => void;
  onSuccess: (resultado: ResultadoAnaliseDTO) => void;
}

export function RevisaoAnaliseModal({ equipamentoId, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const revisarMutation = useMutation({
    mutationFn: (data: FormData) => {
      // Remove campos NaN (input vazio)
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== '' && !(typeof v === 'number' && isNaN(v)))
      );
      return equipamentosApi.revisar(equipamentoId, payload);
    },
    onSuccess: (data) => onSuccess(data),
    onError: (e: AxiosError<ErroResponse>) => {
      alert(e.response?.data?.mensagem || 'Erro ao revisar');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Revisar Análise</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => revisarMutation.mutate(d))} className="p-6 space-y-4">
          <p className="text-sm text-slate-500">
            Corrija os campos que a IA leu errado. Campos vazios não sobrescrevem o valor atual.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fabricante" {...register('fabricante')} />
            <Input label="Modelo" {...register('modelo')} />
          </div>

          <h3 className="text-sm font-medium text-slate-700 pt-2">CPU</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fabricante CPU" {...register('cpuFabricante')} />
            <Input label="Modelo CPU" {...register('cpuModelo')} />
            <Input label="Geração" type="number" {...register('cpuGeracao', { valueAsNumber: true })} />
            <Input label="Cores" type="number" {...register('cpuCores', { valueAsNumber: true })} />
            <Input label="Threads" type="number" {...register('cpuThreads', { valueAsNumber: true })} />
          </div>

          <h3 className="text-sm font-medium text-slate-700 pt-2">Memória e armazenamento</h3>
          <div className="grid grid-cols-3 gap-4">
            <Input label="RAM (GB)" type="number" {...register('ramGb', { valueAsNumber: true })} />
            <Input label="Tipo disco" placeholder="SSD / HDD" {...register('armazenamentoTipo')} />
            <Input label="Capacidade (GB)" type="number" {...register('armazenamentoGb', { valueAsNumber: true })} />
          </div>

          <h3 className="text-sm font-medium text-slate-700 pt-2">Sistema operacional</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" {...register('soNome')} />
            <Input label="Versão" {...register('soVersao')} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observações
            </label>
            <textarea
              {...register('observacoes')}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={revisarMutation.isPending}>
              Salvar e Reavaliar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}