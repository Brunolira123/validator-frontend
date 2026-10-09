import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900">404</h1>
        <p className="text-neutral-500 mt-2">Página não encontrada</p>
        <Link to="/" className="text-vr-700 hover:underline mt-4 inline-block">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}