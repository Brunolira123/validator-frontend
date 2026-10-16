import { Navigate, useParams } from 'react-router-dom';

/** Rotas antigas (antes do portal): mantém links, favoritos e PWA instalado funcionando. */
export function RedirecionarComId({ para }: { para: string }) {
  const { id } = useParams();
  return <Navigate to={`${para}/${id}`} replace />;
}
