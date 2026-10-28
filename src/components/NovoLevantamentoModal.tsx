import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { levantamentosApi } from '../api/levantamentos';
import { mensagemErro } from '../api/erro';
import { Button } from './Button';
import { Modal } from './Modal';
import { ErrorAlert } from './ErrorAlert';
import { CamposLevantamento } from './CamposLevantamento';
import { dadosLevantamento, levantamentoPadrao, levantamentoSchema, type LevantamentoForm } from '../levantamentoForm';

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
  } = useForm<LevantamentoForm>({
    resolver: zodResolver(levantamentoSchema),
    defaultValues: levantamentoPadrao,
  });

  const consultaPreco = watch('consultaPreco');

  const criarMutation = useMutation({
    mutationFn: (data: LevantamentoForm) => levantamentosApi.criar({ clienteId, ...dadosLevantamento(data) }),
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
    <Modal title="Nova validação de servidor" onClose={onClose}>
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

        <CamposLevantamento register={register} errors={errors} consultaPreco={consultaPreco} />

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
