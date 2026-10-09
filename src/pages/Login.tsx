import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { mensagemErro } from '../api/erro';
import { Input } from '../components/Input';
import { ErrorAlert } from '../components/ErrorAlert';
import { Button } from '../components/Button';
import { Marca } from '../components/Marca';


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
    // Fundo grafite com brilho laranja, como as seções escuras do site da VR
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden bg-neutral-950 p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-vr-500/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-48 -left-32 h-[24rem] w-[24rem] rounded-full bg-[#ff9e01]/10 blur-3xl"
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 motion-safe:animate-slide-up">
        <div className="flex flex-col items-center text-center mb-8">
          <Marca tema="claro" />
          <p className="text-sm text-neutral-500 mt-4">Entre para validar a infraestrutura dos clientes</p>
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

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}