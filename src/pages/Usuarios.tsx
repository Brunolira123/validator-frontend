import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, UserRound } from 'lucide-react';
import { usuariosApi } from '../api/usuarios';
import { mensagemErro } from '../api/erro';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { BotaoExcluir, ConfirmarExclusao } from '../components/ConfirmarExclusao';
import { UsuarioModal } from '../components/UsuarioModal';
import { useAuthStore } from '../stores/authStore';
import { perfilLabel } from '../labels';
import type { UsuarioAdmin } from '../types/api';

export default function Usuarios() {
  const queryClient = useQueryClient();
  const meuId = useAuthStore((s) => s.usuario?.id);
  const [editando, setEditando] = useState<UsuarioAdmin | 'novo' | null>(null);
  const [excluindo, setExcluindo] = useState<UsuarioAdmin | null>(null);

  const { data: usuarios, isLoading, error } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuariosApi.listar,
  });

  const excluirMutation = useMutation({
    mutationFn: (id: number) => usuariosApi.excluir(id),
    onSuccess: () => {
      setExcluindo(null);
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const ativos = usuarios?.filter((u) => u.ativo).length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Usuários</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {usuarios?.length ?? 0} usuário(s) · {ativos} ativo(s)
          </p>
        </div>
        <Button onClick={() => setEditando('novo')}>
          <Plus size={16} />
          Novo usuário
        </Button>
      </div>

      {isLoading && <p className="text-neutral-500">Carregando...</p>}
      {error && <ErrorAlert>{mensagemErro(error, 'Erro ao carregar usuários')}</ErrorAlert>}

      <Card className="!p-0 overflow-hidden">
        <ul className="divide-y divide-neutral-100">
          {usuarios?.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <span
                aria-hidden="true"
                className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-full ${
                  u.ativo ? 'bg-vr-500/10 text-vr-600' : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                <UserRound size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`font-medium truncate ${u.ativo ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {u.nome}
                  {u.id === meuId && <span className="text-xs text-neutral-400 font-normal"> (você)</span>}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {u.login} · {u.email}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                  {perfilLabel[u.perfil]}
                </span>
                {!u.ativo && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-800 text-white">Inativo</span>
                )}
              </div>
              <button
                type="button"
                aria-label={`Editar ${u.nome}`}
                title="Editar"
                onClick={() => setEditando(u)}
                className="h-11 w-11 md:h-9 md:w-9 shrink-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
              >
                <Pencil size={18} />
              </button>
              {u.id !== meuId && <BotaoExcluir rotulo={`Excluir ${u.nome}`} onClick={() => setExcluindo(u)} />}
            </li>
          ))}
        </ul>
      </Card>

      {editando && (
        <UsuarioModal
          usuario={editando === 'novo' ? undefined : editando}
          ehOProprio={editando !== 'novo' && editando.id === meuId}
          onClose={() => setEditando(null)}
          onSuccess={() => {
            setEditando(null);
            queryClient.invalidateQueries({ queryKey: ['usuarios'] });
          }}
        />
      )}

      {excluindo && (
        <ConfirmarExclusao
          titulo={`Excluir ${excluindo.nome}?`}
          aviso="A exclusão é definitiva. Quem tem registros no sistema não pode ser excluído: nesse caso, desative."
          onConfirmar={() => excluirMutation.mutate(excluindo.id)}
          onCancelar={() => {
            setExcluindo(null);
            excluirMutation.reset();
          }}
          excluindo={excluirMutation.isPending}
          erro={excluirMutation.error ? mensagemErro(excluirMutation.error, 'Erro ao excluir usuário') : null}
        >
          <p>
            O login <strong>{excluindo.login}</strong> deixa de existir.
          </p>
        </ConfirmarExclusao>
      )}
    </div>
  );
}
