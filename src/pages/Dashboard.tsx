import { useQuery } from '@tanstack/react-query';
import { clientesApi } from '../api/clientes';
import { Card } from '../components/Card';


export default function Dashboard() {
  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['clientes'],
    queryFn: clientesApi.listar,
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Clientes cadastrados</p>
      </div>

      {isLoading && <p className="text-slate-500">Carregando...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          Erro ao carregar clientes
        </div>
      )}

      {clientes && clientes.length === 0 && (
        <Card>
          <p className="text-slate-500">Nenhum cliente cadastrado ainda.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes?.map((c) => (
          <Card key={c.id}>
            <h3 className="font-semibold text-slate-900">{c.razaoSocial}</h3>
            <p className="text-sm text-slate-500 mt-1">{c.cnpj}</p>
            {c.cidade && (
              <p className="text-xs text-slate-400 mt-2">
                {c.cidade} - {c.uf}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}