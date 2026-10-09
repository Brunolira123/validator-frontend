import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { levantamentosApi } from '../api/levantamentos';
import { mensagemErro } from '../api/erro';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { ErrorAlert } from './ErrorAlert';

const quantidade = z
  .number({ error: 'Informe um número' })
  .int('Use número inteiro')
  .min(0, 'Não pode ser negativo');

const schema = z
  .object({
    qtdServidores: quantidade,
    qtdPdvs: quantidade,
    qtdRetaguardas: quantidade,
    consultaPreco: z.boolean(),
    qtdConsultaPreco: z.union([z.number(), z.nan()]),
    outros: z.string().optional(),
  })
  // Só valida a quantidade se o campo estiver visível
  .superRefine((d, ctx) => {
    if (!d.consultaPreco) return;
    const r = quantidade.safeParse(d.qtdConsultaPreco);
    if (!r.success) {
      ctx.addIssue({ code: 'custom', path: ['qtdConsultaPreco'], message: r.error.issues[0].message });
    }
  });

type FormData = z.infer<typeof schema>;

interface Props {
  clienteId: number;
  onClose: () => void;
  onSuccess: (levantamentoId: number) => void;
}

export function NovoLevantamentoModal({ clienteId, onClose, onSuccess }: Props) {
  const [erro, setErro] = useState<string | null>(null);

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
      // Gera os equipamentos automaticamente. Se falhar, ainda navega pro
      // levantamento — lá tem o botão "Gerar equipamentos" pra tentar de novo.
      try {
        await levantamentosApi.gerarEquipamentos(l.id);
      } catch (e) {
        console.error('Erro ao gerar equipamentos', e);
      }
      onSuccess(l.id);
    },
    onError: (e) => setErro(mensagemErro(e, 'Erro ao criar levantamento')),
  });

  return (
    <Modal title="Novo Levantamento" onClose={onClose}>
      <form
        onSubmit={handleSubmit((d) => {
          setErro(null);
          criarMutation.mutate(d);
        })}
        className="p-4 sm:p-6 space-y-4"
      >
        <p className="text-sm text-neutral-500">
          Informe o dimensionamento do ambiente que será implantado.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Servidores"
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.qtdServidores?.message}
            {...register('qtdServidores', { valueAsNumber: true })}
          />
          <Input
            label="PDVs"
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.qtdPdvs?.message}
            {...register('qtdPdvs', { valueAsNumber: true })}
          />
          <Input
            label="Retaguardas"
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.qtdRetaguardas?.message}
            {...register('qtdRetaguardas', { valueAsNumber: true })}
          />
        </div>

        <label
          htmlFor="consultaPreco"
          className="flex items-center gap-3 min-h-11 text-sm text-neutral-700 cursor-pointer"
        >
          <input
            type="checkbox"
            id="consultaPreco"
            {...register('consultaPreco')}
            className="w-5 h-5 text-vr-600 border-neutral-300 rounded focus:ring-vr-500"
          />
          Possui consulta de preço?
        </label>

        {consultaPreco && (
          <Input
            label="Quantidade de consultas de preço"
            type="number"
            inputMode="numeric"
            min={0}
            error={errors.qtdConsultaPreco?.message}
            {...register('qtdConsultaPreco', { valueAsNumber: true })}
          />
        )}

        <div>
          <label htmlFor="outros" className="block text-sm font-medium text-neutral-700 mb-1">
            Outros (opcional)
          </label>
          <textarea
            id="outros"
            {...register('outros')}
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
            placeholder="Informações adicionais..."
          />
        </div>

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting || criarMutation.isPending}>
            Criar e Gerar Equipamentos
          </Button>
        </div>
      </form>
    </Modal>
  );
}
