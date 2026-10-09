import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Plus } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { mensagemErro } from '../api/erro';
import { Button } from '../components/Button';
import { NovoClienteModal } from '../components/NovoClienteModal';
import { BotaoExcluir, ConfirmarExclusao } from '../components/ConfirmarExclusao';
import { useIsAdmin } from '../stores/authStore';
import { formatarCnpj } from '../labels';
import type { ClienteResponse } from '../types/api';

export default function Clientes() {
  const [modalOpen, setModalOpen] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<ClienteResponse | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['clientes'],
    queryFn: clientesApi.listar,
  });

  const excluirMutation = useMutation({
    mutationFn: (id: number) => clientesApi.excluir(id),
    onSuccess: async (_, id) => {
      setParaExcluir(null);
      queryClient.setQueryData<ClienteResponse[]>(['clientes'], (lista) => lista?.filter((c) => c.id !== id));
      await queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Clientes</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {clientes?.length ?? 0} cliente(s) cadastrado(s)
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Novo Cliente
        </Button>
      </div>

      {isLoading && <p className="text-neutral-500">Carregando...</p>}

      {error && <ErrorAlert>{mensagemErro(error, 'Erro ao carregar clientes')}</ErrorAlert>}

      {clientes && clientes.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <Building2 size={32} className="mx-auto text-neutral-300" />
            <p className="text-neutral-500 mt-3">
              Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {clientes?.map((c) => (
          <Card
            key={c.id}
            interativo
            onClick={() => navigate(`/clientes/${c.id}`)}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-vr-50 text-vr-600 font-bold"
              >
                {c.razaoSocial.trim().charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-neutral-900 break-words">{c.razaoSocial}</h3>
                {c.nomeFantasia && (
                  <p className="text-sm text-neutral-500 truncate">{c.nomeFantasia}</p>
                )}
                <p className="text-xs text-neutral-400 mt-1 tabular-nums">{formatarCnpj(c.cnpj)}</p>
                {(c.cidade || c.uf) && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500">
                    <MapPin size={12} />
                    {c.cidade} {c.uf && `- ${c.uf}`}
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="-mr-2 -mt-2">
                  <BotaoExcluir rotulo={`Excluir ${c.razaoSocial}`} onClick={() => setParaExcluir(c)} />
                </div>
              )}
            </div>
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

      {paraExcluir && (
        <ConfirmarExclusao
          titulo="Excluir cliente?"
          excluindo={excluirMutation.isPending}
          erro={excluirMutation.error ? mensagemErro(excluirMutation.error, 'Erro ao excluir cliente') : null}
          onConfirmar={() => excluirMutation.mutate(paraExcluir.id)}
          onCancelar={() => {
            setParaExcluir(null);
            excluirMutation.reset();
          }}
        >
          <p>
            <strong className="text-neutral-900">{paraExcluir.razaoSocial}</strong> e todos os
            levantamentos dele vão sumir da lista.
          </p>
        </ConfirmarExclusao>
      )}
    </div>
  );
}
