import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { usuariosApi } from '../api/usuarios';
import { mensagemErro } from '../api/erro';
import { perfilLabel } from '../labels';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { ErrorAlert } from './ErrorAlert';
import type { Perfil, UsuarioAdmin } from '../types/api';

const perfis = Object.keys(perfilLabel) as Perfil[];

const schema = z.object({
  login: z
    .string()
    .trim()
    .min(1, 'Informe o login')
    .max(50)
    .regex(/^[A-Za-z0-9._-]+$/, 'Use só letras, números, ponto, hífen e sublinhado'),
  nome: z.string().trim().min(1, 'Informe o nome').max(100),
  email: z.string().trim().email('E-mail inválido').max(150),
  perfil: z.enum(perfis as [Perfil, ...Perfil[]]),
  ativo: z.boolean(),
  senha: z.string().max(100),
});

type FormData = z.infer<typeof schema>;

interface Props {
  /** Ausente = novo usuário. */
  usuario?: UsuarioAdmin;
  /** O próprio usuário logado: perfil e ativo ficam travados (o backend também barra). */
  ehOProprio?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UsuarioModal({ usuario, ehOProprio = false, onClose, onSuccess }: Props) {
  const novo = !usuario;
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      login: usuario?.login ?? '',
      nome: usuario?.nome ?? '',
      email: usuario?.email ?? '',
      perfil: usuario?.perfil ?? 'COMERCIAL',
      ativo: usuario?.ativo ?? true,
      senha: '',
    },
  });

  const salvarMutation = useMutation({
    mutationFn: (data: FormData) =>
      novo
        ? usuariosApi.criar({ login: data.login, nome: data.nome, email: data.email, perfil: data.perfil, senha: data.senha })
        : usuariosApi.atualizar(usuario.id, {
            nome: data.nome,
            email: data.email,
            perfil: data.perfil,
            ativo: data.ativo,
            senha: data.senha || undefined,
          }),
    onSuccess,
    onError: (e) => setErro(mensagemErro(e, 'Erro ao salvar usuário')),
  });

  const onSubmit = (data: FormData) => {
    // Senha: obrigatória ao criar; ao editar, vazia mantém a atual
    if ((novo || data.senha) && data.senha.length < 8) {
      setError('senha', { message: 'A senha precisa ter pelo menos 8 caracteres' });
      return;
    }
    setErro(null);
    salvarMutation.mutate(data);
  };

  return (
    <Modal title={novo ? 'Novo usuário' : `Editar ${usuario.nome}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
        <Input
          label="Login"
          autoFocus={novo}
          autoComplete="off"
          disabled={!novo}
          hint={novo ? 'É com ele que a pessoa entra no sistema' : 'O login não pode ser alterado'}
          error={errors.login?.message}
          {...register('login')}
        />
        <Input label="Nome" autoFocus={!novo} error={errors.nome?.message} {...register('nome')} />
        <Input label="E-mail" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />

        <div>
          <label htmlFor="usuario-perfil" className="block text-sm font-medium text-neutral-700 mb-1">
            Perfil
          </label>
          <select
            id="usuario-perfil"
            disabled={ehOProprio}
            className="w-full min-h-11 px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vr-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            {...register('perfil')}
          >
            {perfis.map((p) => (
              <option key={p} value={p}>
                {perfilLabel[p]}
              </option>
            ))}
          </select>
          {ehOProprio && <p className="text-xs text-neutral-400 mt-1">Você não pode trocar o próprio perfil</p>}
        </div>

        <Input
          label={novo ? 'Senha' : 'Nova senha (opcional)'}
          type="password"
          autoComplete="new-password"
          hint={novo ? 'Mínimo de 8 caracteres' : 'Deixe em branco para manter a senha atual'}
          error={errors.senha?.message}
          {...register('senha')}
        />

        {!novo && (
          <label className="flex items-center gap-3 min-h-11 cursor-pointer">
            <input
              type="checkbox"
              disabled={ehOProprio}
              className="h-5 w-5 rounded border-neutral-300 text-vr-600 focus:ring-vr-500"
              {...register('ativo')}
            />
            <span className="text-sm text-neutral-700">
              Ativo <span className="text-neutral-400">(desativado não consegue entrar)</span>
            </span>
          </label>
        )}

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={salvarMutation.isPending}>
            {novo ? 'Criar usuário' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
