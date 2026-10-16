import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { ErrorAlert } from './ErrorAlert';
import type { TokenAgenteResponse } from '../types/api';

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do cliente').max(150),
  cnpj: z
    .string()
    .optional()
    .refine((v) => !v || v.replace(/[^0-9A-Za-z]/g, '').length === 14, 'CNPJ precisa ter 14 caracteres'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess: (resultado: TokenAgenteResponse) => void;
}

export function NovoClienteMonitoradoModal({ onClose, onSuccess }: Props) {
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const criarMutation = useMutation({
    mutationFn: monitorApi.criar,
    onSuccess,
    onError: (e) => setErro(mensagemErro(e, 'Erro ao cadastrar cliente')),
  });

  const onSubmit = (data: FormData) => {
    setErro(null);
    criarMutation.mutate({ nome: data.nome, cnpj: data.cnpj || undefined });
  };

  return (
    <Modal title="Novo cliente monitorado" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
        <Input label="Nome" autoFocus error={errors.nome?.message} {...register('nome')} />
        <Input
          label="CNPJ (opcional)"
          placeholder="00.000.000/0000-00"
          autoComplete="off"
          error={errors.cnpj?.message}
          {...register('cnpj')}
        />
        <p className="text-sm text-neutral-500">
          Ao salvar, é gerado o token que vai no <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">vr.properties</code>{' '}
          do agente instalado no cliente.
        </p>

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={criarMutation.isPending}>
            Cadastrar e gerar token
          </Button>
        </div>
      </form>
    </Modal>
  );
}
