import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { mensagemErro } from '../api/erro';
import { Input } from '../components/Input';
import { ErrorAlert } from '../components/ErrorAlert';


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
    // Credenciais pré-preenchidas só em dev
    defaultValues: import.meta.env.DEV ? { login: 'admin', senha: 'admin' } : undefined,
  });

  const onSubmit = async (data: FormData) => {
    setErro(null);
    try {
      await login(data.login, data.senha);
      navigate('/');
    } catch (e) {
      setErro(mensagemErro(e, 'Erro ao fazer login'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vr-900 via-vr-700 to-vr-500 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-vr-900">Validador VR</h1>
          <p className="text-sm text-slate-500 mt-1">Validação de Infraestrutura</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Login"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            error={errors.login?.message}
            {...register('login')}
          />

          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.senha?.message}
            {...register('senha')}
          />

          {erro && <ErrorAlert>{erro}</ErrorAlert>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-11 bg-vr-900 hover:bg-vr-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}