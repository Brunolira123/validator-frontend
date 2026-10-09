import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { equipamentosApi } from '../api/equipamentos';
import { mensagemErro } from '../api/erro';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { ErrorAlert } from './ErrorAlert';
import type { AnaliseResponse, ResultadoAnaliseDTO } from '../types/api';

// Campo numérico opcional: vazio vira NaN (valueAsNumber) e é descartado no payload
const inteiroOpcional = z
  .union([z.number().int('Use número inteiro').min(0, 'Não pode ser negativo'), z.nan()])
  .optional();

const schema = z.object({
  fabricante: z.string().optional(),
  modelo: z.string().optional(),
  cpuFabricante: z.string().optional(),
  cpuModelo: z.string().optional(),
  cpuGeracao: inteiroOpcional,
  cpuCores: inteiroOpcional,
  cpuThreads: inteiroOpcional,
  ramGb: inteiroOpcional,
  armazenamentoTipo: z.string().optional(),
  armazenamentoGb: inteiroOpcional,
  soNome: z.string().optional(),
  soVersao: z.string().optional(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  equipamentoId: number;
  analiseAtual?: AnaliseResponse | null;
  onClose: () => void;
  onSuccess: (resultado: ResultadoAnaliseDTO) => void;
}

export function RevisaoAnaliseModal({ equipamentoId, analiseAtual, onClose, onSuccess }: Props) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fabricante: analiseAtual?.fabricante ?? '',
      modelo: analiseAtual?.modelo ?? '',
      cpuFabricante: analiseAtual?.cpuFabricante ?? '',
      cpuModelo: analiseAtual?.cpuModelo ?? '',
      cpuGeracao: analiseAtual?.cpuGeracao ?? undefined,
      cpuCores: analiseAtual?.cpuCores ?? undefined,
      cpuThreads: analiseAtual?.cpuThreads ?? undefined,
      ramGb: analiseAtual?.ramGb ?? undefined,
      armazenamentoTipo: analiseAtual?.armazenamentoTipo ?? '',
      armazenamentoGb: analiseAtual?.armazenamentoGb ?? undefined,
      soNome: analiseAtual?.soNome ?? '',
      soVersao: analiseAtual?.soVersao ?? '',
      observacoes: '',
    },
  });

  const revisarMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = Object.fromEntries(
        Object.entries(data).filter(
          ([, v]) => v !== undefined && v !== '' && !(typeof v === 'number' && isNaN(v))
        )
      );
      return equipamentosApi.revisar(equipamentoId, payload);
    },
    onSuccess: (data) => onSuccess(data),
    onError: (e) => setErro(mensagemErro(e, 'Erro ao revisar')),
  });

  return (
    <Modal title="Revisar Análise" onClose={onClose} size="2xl">
        <form
          onSubmit={handleSubmit((d) => {
            setErro(null);
            revisarMutation.mutate(d);
          })}
          className="p-4 sm:p-6 space-y-4"
        >
          <p className="text-sm text-neutral-500">
            Os campos já vêm preenchidos com o que a IA leu. Corrija só o que estiver errado.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Fabricante" {...register('fabricante')} />
            <Input label="Modelo" {...register('modelo')} />
          </div>

          <h3 className="text-sm font-medium text-neutral-700 pt-2">CPU</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Fabricante CPU" {...register('cpuFabricante')} />
            <Input label="Modelo CPU" {...register('cpuModelo')} />
            <Input label="Geração" type="number" inputMode="numeric" error={errors.cpuGeracao?.message} {...register('cpuGeracao', { valueAsNumber: true })} />
            <Input label="Cores" type="number" inputMode="numeric" error={errors.cpuCores?.message} {...register('cpuCores', { valueAsNumber: true })} />
            <Input label="Threads" type="number" inputMode="numeric" error={errors.cpuThreads?.message} {...register('cpuThreads', { valueAsNumber: true })} />
          </div>

          <h3 className="text-sm font-medium text-neutral-700 pt-2">Memória e armazenamento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="RAM (GB)" type="number" inputMode="numeric" error={errors.ramGb?.message} {...register('ramGb', { valueAsNumber: true })} />
            <Input label="Tipo disco" placeholder="SSD / HDD" {...register('armazenamentoTipo')} />
            <Input label="Capacidade (GB)" type="number" inputMode="numeric" error={errors.armazenamentoGb?.message} {...register('armazenamentoGb', { valueAsNumber: true })} />
          </div>

          <h3 className="text-sm font-medium text-neutral-700 pt-2">Sistema operacional</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome" {...register('soNome')} />
            <Input label="Versão" {...register('soVersao')} />
          </div>

          <div>
            <label htmlFor="observacoes" className="block text-sm font-medium text-neutral-700 mb-1">
              Observações
            </label>
            <textarea
              id="observacoes"
              {...register('observacoes')}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
            />
          </div>

          {erro && <ErrorAlert>{erro}</ErrorAlert>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={revisarMutation.isPending}>
              Salvar e Reavaliar
            </Button>
          </div>
        </form>
    </Modal>
  );
}