import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { prospeccaoApi } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { motivoPerdaLabel } from '../labels';
import type { MotivoPerda } from '../types/api';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';
import { Modal } from './Modal';

const TAMANHO_MAXIMO_OBSERVACAO = 500;

const schema = z.object({
  motivo: z.enum(['PRECO', 'CONCORRENTE', 'SEM_INTERESSE', 'OUTRO'], { error: 'Escolha o motivo' }),
  observacao: z.string().max(TAMANHO_MAXIMO_OBSERVACAO, `No máximo ${TAMANHO_MAXIMO_OBSERVACAO} caracteres`),
});

type FormData = z.infer<typeof schema>;

const motivos: { valor: MotivoPerda; descricao: string }[] = [
  { valor: 'PRECO', descricao: 'Achou caro' },
  { valor: 'CONCORRENTE', descricao: 'Fechou com outro' },
  { valor: 'SEM_INTERESSE', descricao: 'Não quer trocar' },
  { valor: 'OUTRO', descricao: 'Conte na observação' },
];

interface Props {
  prospectId: number;
  nome: string;
  onClose: () => void;
}

/** Negociação perdida depois da visita: o lugar fica livre para outro comercial, como o descartado. */
export function PerdidoModal({ prospectId, nome, onClose }: Props) {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { observacao: '' },
  });

  const motivo = watch('motivo');
  const observacao = watch('observacao') ?? '';

  const perderMutation = useMutation({
    mutationFn: (d: FormData) =>
      prospeccaoApi.perder(prospectId, { motivo: d.motivo, observacao: d.observacao.trim() || undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['prospeccao'] });
      onClose();
    },
    onError: (e) => setErro(mensagemErro(e, 'Erro ao marcar como perdido')),
  });

  return (
    <Modal title="Negociação perdida" onClose={perderMutation.isPending ? () => {} : onClose}>
      <form
        onSubmit={handleSubmit((d) => {
          setErro(null);
          perderMutation.mutate(d);
        })}
        className="p-4 sm:p-6 space-y-5"
      >
        <p className="text-sm text-neutral-600 break-words">
          Por que <span className="font-semibold text-neutral-900">{nome}</span> não fechou?
        </p>

        <div>
          <div role="radiogroup" aria-label="Motivo da perda" className="grid grid-cols-2 gap-3">
            {motivos.map((m) => {
              const marcado = motivo === m.valor;
              return (
                <button
                  key={m.valor}
                  type="button"
                  role="radio"
                  aria-checked={marcado}
                  onClick={() => setValue('motivo', m.valor, { shouldValidate: true })}
                  className={`flex flex-col items-center justify-center gap-1 min-h-20 p-3 rounded-xl border-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-2 ${
                    marcado
                      ? 'border-neutral-800 bg-neutral-100 text-neutral-900'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <span className="font-semibold">{motivoPerdaLabel[m.valor]}</span>
                  <span className="text-xs text-neutral-500">{m.descricao}</span>
                </button>
              );
            })}
          </div>
          {errors.motivo && <p className="text-xs text-red-500 mt-1">{errors.motivo.message}</p>}
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="perdido-observacao" className="text-sm font-medium text-neutral-700">
              Observação (opcional)
            </label>
            <span className="text-xs text-neutral-400 tabular-nums" aria-hidden="true">
              {observacao.length}/{TAMANHO_MAXIMO_OBSERVACAO}
            </span>
          </div>
          <textarea
            id="perdido-observacao"
            rows={3}
            maxLength={TAMANHO_MAXIMO_OBSERVACAO}
            aria-invalid={!!errors.observacao}
            {...register('observacao')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
            placeholder="Valor oferecido, concorrente, quando voltar..."
          />
          {errors.observacao && <p className="text-xs text-red-500 mt-1">{errors.observacao.message}</p>}
        </div>

        <p className="text-xs text-neutral-500">
          O lugar fica livre: outro comercial pode assumir. Uma nova visita sua antes disso reabre a negociação.
        </p>

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={perderMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={perderMutation.isPending}>
            Marcar como perdido
          </Button>
        </div>
      </form>
    </Modal>
  );
}
