import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowLeft, Plus, Building2 } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { levantamentosApi } from '../api/levantamentos';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { NovoLevantamentoModal } from '../components/NovoLevantamentoModal';
import { StatusLevantamentoBadge } from '../components/StatusLevantamentoBadge';

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const clienteId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => clientesApi.buscar(clienteId),
  });

  const { data: levantamentos, isLoading: loadingLev } = useQuery({
    queryKey: ['levantamentos', clienteId],
    queryFn: () => levantamentosApi.listarPorCliente(clienteId),
    enabled: !isNaN(clienteId),
  });

  if (loadingCliente) return <div className="p-8 text-slate-500">Carregando...</div>;
  if (!cliente) return <div className="p-8 text-red-600">Cliente não encontrado</div>;

  return (
    <div className="p-8">
      <Link
        to="/clientes"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para clientes
      </Link>

      <Card className="mb-6">
        <div className="flex items-start gap-4">
          <div className="bg-vr-50 p-3 rounded-lg">
            <Building2 size={24} className="text-vr-900" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{cliente.razaoSocial}</h1>
            {cliente.nomeFantasia && (
              <p className="text-sm text-slate-500">{cliente.nomeFantasia}</p>
            )}
            <p className="text-sm text-slate-500 mt-2">CNPJ: {cliente.cnpj}</p>
            {(cliente.cidade || cliente.uf) && (
              <p className="text-sm text-slate-500">
                {cliente.cidade} {cliente.uf && `- ${cliente.uf}`}
              </p>
            )}
            {cliente.telefone && (
              <p className="text-sm text-slate-500">Tel: {cliente.telefone}</p>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Levantamentos</h2>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Novo Levantamento
        </Button>
      </div>

      {loadingLev && <p className="text-slate-500">Carregando...</p>}

      {levantamentos && levantamentos.length === 0 && (
        <Card>
          <p className="text-slate-500 text-center py-8">
            Nenhum levantamento criado ainda.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {levantamentos?.map((l) => (
          <Card
            key={l.id}
            className="cursor-pointer hover:border-vr-500 transition-colors"
            onClick={() => navigate(`/levantamentos/${l.id}`)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  Levantamento #{l.id}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {l.qtdServidores} servidor(es) · {l.qtdPdvs} PDV(s) · {l.qtdRetaguardas} retaguarda(s)
                  {l.consultaPreco && ` · ${l.qtdConsultaPreco} consulta(s) de preço`}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Criado em {new Date(l.criadoEm).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <StatusLevantamentoBadge status={l.status} />
            </div>
          </Card>
        ))}
      </div>

      {modalOpen && (
        <NovoLevantamentoModal
          clienteId={clienteId}
          onClose={() => setModalOpen(false)}
          onSuccess={(levantamentoId) => {
            queryClient.invalidateQueries({ queryKey: ['levantamentos', clienteId] });
            setModalOpen(false);
            navigate(`/levantamentos/${levantamentoId}`);
          }}
        />
      )}
    </div>
  );
}