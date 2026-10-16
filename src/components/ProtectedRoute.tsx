import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { Perfil } from '../types/api';

interface Props {
  /** Sem `children`, guarda as rotas filhas (renderiza o <Outlet />). */
  children?: React.ReactNode;
  /** Sem `perfis`, basta estar logado. Com, quem não está na lista volta para a home. */
  perfis?: Perfil[];
}

export function ProtectedRoute({ children, perfis }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const perfil = useAuthStore((s) => s.usuario?.perfil);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (perfis && (!perfil || !perfis.includes(perfil))) {
    return <Navigate to="/" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
