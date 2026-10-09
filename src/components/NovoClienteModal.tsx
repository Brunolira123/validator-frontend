import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { X, Search, Loader2 } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { Button } from './Button';
import { Input } from './Input';
import type { ErroResponse } from '../types/api';

const schema = z.object({
  cnpj: z.string().min(14, 'CNPJ inválido'),
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
    onError: (e: AxiosError<ErroResponse>) => {
      setErroGeral(e.response?.data?.mensagem || 'Erro ao criar cliente');
    },
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
      const axiosError = e as AxiosError<ErroResponse>;
      setErroCnpj(axiosError.response?.data?.mensagem || 'Erro ao consultar CNPJ');
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Novo Cliente</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="CNPJ"
                placeholder="00.000.000/0000-00"
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

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefone"
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

          {erroGeral && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {erroGeral}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || criarMutation.isPending}>
              Criar Cliente
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}