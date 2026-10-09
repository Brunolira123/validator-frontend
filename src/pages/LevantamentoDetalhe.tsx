import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function LevantamentoDetalhe() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-8">
      <Link
        to="/clientes"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">
        Levantamento #{id}
      </h1>
      <p className="text-slate-500 mt-2">Em construção...</p>
    </div>
  );
}