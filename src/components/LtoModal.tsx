import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { levantamentosApi } from '../api/levantamentos';
import { prospeccaoApi } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';
import { Modal } from './Modal';
import { CamposLevantamento } from './CamposLevantamento';
import { dadosLevantamento, levantamentoPadrao, levantamentoSchema, type LevantamentoForm } from '../levantamentoForm';

interface Props {
  prospectId: number;
  nome: string;
  onClose: () => void;
}

/** LTO do cliente já fechado: só o dimensionamento; o cliente veio do fechamento do contrato. */
export function LtoModal({ prospectId, nome, onClose }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LevantamentoForm>({
    resolver: zodResolver(levantamentoSchema),
    defaultValues: levantamentoPadrao,
  });

  const consultaPreco = watch('consultaPreco');

  const ltoMutation = useMutation({
    mutationFn: (d: LevantamentoForm) => prospeccaoApi.lto(prospectId, dadosLevantamento(d)),
    onSuccess: async ({ levantamentoId }) => {
      // Mesmo fluxo da nova validação: gera os equipamentos e, se falhar, o botão fica no levantamento
      try {
        await levantamentosApi.gerarEquipamentos(levantamentoId);
      } catch (e) {
        console.error('Erro ao gerar equipamentos', e);
      }
      queryClient.invalidateQueries({ queryKey: ['prospeccao'] });
      navigate(`/comercial/levantamentos/${levantamentoId}`);
    },
    onError: (e) => setErro(mensagemErro(e, 'Erro ao registrar o LTO')),
  });

  return (
    <Modal title="LTO" onClose={ltoMutation.isPending ? () => {} : onClose}>
      <form
        onSubmit={handleSubmit((d) => {
          setErro(null);
          ltoMutation.mutate(d);
        })}
        className="p-4 sm:p-6 space-y-4"
      >
        <p className="text-sm text-neutral-600 break-words">
          Validação de servidor de <span className="font-semibold text-neutral-900">{nome}</span>. Informe o
          dimensionamento do ambiente que será implantado.
        </p>

        <CamposLevantamento register={register} errors={errors} consultaPreco={consultaPreco} />

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={ltoMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={ltoMutation.isPending}>
            Criar e gerar equipamentos
          </Button>
        </div>
      </form>
    </Modal>
  );
}
