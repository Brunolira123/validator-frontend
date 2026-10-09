import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';   // ← adiciona
import { Plus } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { NovoClienteModal } from '../components/NovoClienteModal';

export default function Clientes() {
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();   // ← adiciona

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['clientes'],
    queryFn: clientesApi.listar,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {clientes?.length ?? 0} cliente(s) cadastrado(s)
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Novo Cliente
        </Button>
      </div>

      {isLoading && <p className="text-slate-500">Carregando...</p>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          Erro ao carregar clientes
        </div>
      )}

      {clientes && clientes.length === 0 && (
        <Card>
          <p className="text-slate-500 text-center py-8">
            Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientes?.map((c) => (
          <Card
            key={c.id}
            className="cursor-pointer hover:border-vr-500 transition-colors"   // ← adiciona
            onClick={() => navigate(`/clientes/${c.id}`)}                      // ← adiciona
          >
            <h3 className="font-semibold text-slate-900">{c.razaoSocial}</h3>
            <p className="text-sm text-slate-500 mt-1">{c.cnpj}</p>
            {c.nomeFantasia && (
              <p className="text-xs text-slate-400 mt-1">{c.nomeFantasia}</p>
            )}
            {(c.cidade || c.uf) && (
              <p className="text-xs text-slate-400 mt-2">
                {c.cidade} {c.uf && `- ${c.uf}`}
              </p>
            )}
          </Card>
        ))}
      </div>

      {modalOpen && (
        <NovoClienteModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}