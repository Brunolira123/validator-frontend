import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { AxiosError } from 'axios';
import type { ErroResponse } from '../types/api';


const schema = z.object({
  login: z.string().min(1, 'Informe o login'),
  senha: z.string().min(1, 'Informe a senha'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { login: 'admin', senha: 'admin' },
  });

  const onSubmit = async (data: FormData) => {
    setErro(null);
    try {
      await login(data.login, data.senha);
      navigate('/');
    } catch (e) {
      const axiosError = e as AxiosError<ErroResponse>;
      setErro(axiosError.response?.data?.mensagem || 'Erro ao fazer login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vr-900 via-vr-700 to-vr-500 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-vr-900">Validador VR</h1>
          <p className="text-sm text-slate-500 mt-1">Validação de Infraestrutura</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Login
            </label>
            <input
              {...register('login')}
              type="text"
              autoComplete="username"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
            />
            {errors.login && (
              <p className="text-xs text-red-500 mt-1">{errors.login.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              {...register('senha')}
              type="password"
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
            />
            {errors.senha && (
              <p className="text-xs text-red-500 mt-1">{errors.senha.message}</p>
            )}
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-vr-900 hover:bg-vr-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}