import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Search, Loader2 } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { mensagemErro } from '../api/erro';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { ErrorAlert } from './ErrorAlert';

const schema = z.object({
  cnpj: z.string().refine((v) => v.replace(/\D/g, '').length === 14, 'CNPJ precisa ter 14 dígitos'),
  razaoSocial: z.string().min(1, 'Informe a razão social'),
  nomeFantasia: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().max(2).optional(),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function NovoClienteModal({ onClose, onSuccess }: Props) {
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [erroCnpj, setErroCnpj] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const cnpj = watch('cnpj');

  const criarMutation = useMutation({
    mutationFn: clientesApi.criar,
    onSuccess: () => onSuccess(),
    onError: (e) => setErroGeral(mensagemErro(e, 'Erro ao criar cliente')),
  });

  const handleBuscarCnpj = async () => {
    const limpo = cnpj?.replace(/\D/g, '');
    if (!limpo || limpo.length !== 14) {
      setErroCnpj('CNPJ precisa ter 14 dígitos');
      return;
    }

    setBuscandoCnpj(true);
    setErroCnpj(null);

    try {
      const dados = await clientesApi.consultarCnpj(limpo);
      setValue('razaoSocial', dados.razaoSocial);
      if (dados.nomeFantasia) setValue('nomeFantasia', dados.nomeFantasia);
      if (dados.endereco) setValue('endereco', dados.endereco);
      if (dados.cidade) setValue('cidade', dados.cidade);
      if (dados.uf) setValue('uf', dados.uf);
      if (dados.telefone) setValue('telefone', dados.telefone);
      if (dados.email) setValue('email', dados.email);
    } catch (e) {
      setErroCnpj(mensagemErro(e, 'Erro ao consultar CNPJ'));
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const onSubmit = (data: FormData) => {
    setErroGeral(null);
    criarMutation.mutate({
      ...data,
      email: data.email || undefined,
    });
  };

  return (
    <Modal title="Novo Cliente" onClose={onClose} size="2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="CNPJ"
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                autoComplete="off"
                error={errors.cnpj?.message || erroCnpj || undefined}
                {...register('cnpj')}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleBuscarCnpj}
              disabled={buscandoCnpj}
            >
              {buscandoCnpj ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Buscar
            </Button>
          </div>

          <Input
            label="Razão Social"
            error={errors.razaoSocial?.message}
            {...register('razaoSocial')}
          />

          <Input
            label="Nome Fantasia"
            error={errors.nomeFantasia?.message}
            {...register('nomeFantasia')}
          />

          <Input
            label="Endereço"
            error={errors.endereco?.message}
            {...register('endereco')}
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Cidade"
                error={errors.cidade?.message}
                {...register('cidade')}
              />
            </div>
            <Input
              label="UF"
              maxLength={2}
              error={errors.uf?.message}
              {...register('uf')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Telefone"
              type="tel"
              error={errors.telefone?.message}
              {...register('telefone')}
            />
            <Input
              label="E-mail"
              type="email"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          {erroGeral && <ErrorAlert>{erroGeral}</ErrorAlert>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || criarMutation.isPending}>
              Criar Cliente
            </Button>
          </div>
        </form>
    </Modal>
  );
}