import { Navigate, useParams } from 'react-router-dom';

/** Rotas antigas (antes do portal): mantém links, favoritos e PWA instalado funcionando. */
export function RedirecionarComId({ para, busca = '' }: { para: string; busca?: string }) {
  const { id } = useParams();
  return <Navigate to={`${para}/${id}${busca}`} replace />;
}
