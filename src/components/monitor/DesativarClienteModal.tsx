import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { monitorApi } from '../../api/monitor';
import { mensagemErro } from '../../api/erro';
import { toast } from '../../stores/toastStore';
import { Button } from '../Button';
import { ErrorAlert } from '../ErrorAlert';
import { Modal } from '../Modal';

const TAMANHO_MAXIMO_MOTIVO = 300;

interface Props {
  clienteId: number;
  nome: string;
  onClose: () => void;
}

export function DesativarClienteModal({ clienteId, nome, onClose }: Props) {
  const queryClient = useQueryClient();
  const motivoId = useId();
  const [motivo, setMotivo] = useState('');

  const desativar = useMutation({
    mutationFn: () => monitorApi.desativar(clienteId, motivo.trim() || null),
    onSuccess: async () => {
      toast(`${nome} desativado.`);
      await queryClient.invalidateQueries({ queryKey: ['monitor'] });
      onClose();
    },
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    desativar.mutate();
  };

  return (
    <Modal title="Desativar cliente" onClose={desativar.isPending ? () => {} : onClose}>
      <form onSubmit={enviar} className="p-4 sm:p-6 space-y-5">
        <p className="text-sm text-neutral-600 break-words">
          Desativar <span className="font-semibold text-neutral-900">{nome}</span>?
        </p>

        <div className="flex gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
          <TriangleAlert size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
          <p>O agente deixa de ser aceito e o cliente sai das listas. O histórico é mantido.</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor={motivoId} className="text-sm font-medium text-neutral-700">
              Motivo (opcional)
            </label>
            <span className="text-xs text-neutral-400 tabular-nums" aria-hidden="true">
              {motivo.length}/{TAMANHO_MAXIMO_MOTIVO}
            </span>
          </div>
          <textarea
            id={motivoId}
            rows={3}
            maxLength={TAMANHO_MAXIMO_MOTIVO}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Contrato encerrado, troca de servidor..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
          />
        </div>

        {desativar.error && <ErrorAlert>{mensagemErro(desativar.error, 'Erro ao desativar o cliente')}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={desativar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={desativar.isPending}>
            Desativar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
