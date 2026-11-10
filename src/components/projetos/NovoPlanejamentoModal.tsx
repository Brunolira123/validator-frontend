import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { clientesApi } from '../../api/clientes';
import { planejamentosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';
import { ErrorAlert } from '../ErrorAlert';
import { normalizar } from '../../projetos';
import type { ClienteResponse } from '../../types/api';
import type { Planejamento } from '../../types/projetos';

const nomeCliente = (c: ClienteResponse) => c.nomeFantasia || c.razaoSocial;

/** Planejamento sem LTO: escolhe o cliente e nasce em RASCUNHO. */
export function NovoPlanejamentoModal({ onClose, onCriado }: { onClose: () => void; onCriado: (p: Planejamento) => void }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState('');
  const [cliente, setCliente] = useState<ClienteResponse | null>(null);
  const [nome, setNome] = useState('');
  const [kickoff, setKickoff] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const { data: clientes, isLoading, error } = useQuery({ queryKey: ['clientes'], queryFn: clientesApi.listar });

  const termo = normalizar(busca);
  const filtrados = (clientes ?? [])
    .filter((c) => !termo || normalizar(`${c.nomeFantasia ?? ''} ${c.razaoSocial} ${c.cnpj}`).includes(termo))
    .sort((a, b) => nomeCliente(a).localeCompare(nomeCliente(b)))
    .slice(0, 50);

  const criar = useMutation({
    mutationFn: () =>
      planejamentosApi.criar({ clienteId: cliente!.id, nome: nome.trim(), kickoff: kickoff || null }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['projetos', 'planejamentos'] });
      qc.setQueryData(['projetos', 'planejamento', p.id], p);
      onCriado(p);
    },
    onError: (e) => setErro(mensagemErro(e, 'Não foi possível criar o planejamento.')),
  });

  const escolher = (c: ClienteResponse) => {
    setCliente(c);
    if (!nome.trim()) setNome(`Implantação ${nomeCliente(c)}`);
  };

  return (
    <Modal title="Planejamento avulso" onClose={onClose}>
      <form
        className="p-4 sm:p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!cliente) return setErro('Escolha o cliente.');
          if (!nome.trim()) return setErro('Informe o nome do planejamento.');
          setErro(null);
          criar.mutate();
        }}
      >
        {!cliente ? (
          <div>
            <label htmlFor="busca-cliente" className="block text-sm font-medium text-neutral-700 mb-1">
              Cliente
            </label>
            <div className="relative">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="busca-cliente"
                type="search"
                autoFocus
                placeholder="Nome ou CNPJ"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full min-h-11 pl-9 pr-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vr-500"
              />
            </div>
            {error && <div className="mt-2"><ErrorAlert>{mensagemErro(error, 'Não foi possível carregar os clientes.')}</ErrorAlert></div>}
            {isLoading && <p className="mt-2 text-sm text-neutral-500">Carregando clientes…</p>}
            <ul className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 divide-y divide-neutral-100">
              {filtrados.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => escolher(c)}
                    className="w-full text-left px-3 py-2.5 min-h-11 hover:bg-vr-50 focus:outline-none focus-visible:bg-vr-50"
                  >
                    <span className="block text-sm font-medium text-neutral-900">{nomeCliente(c)}</span>
                    <span className="block text-xs text-neutral-500">
                      {[c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.uf, c.cnpj].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
              {clientes && filtrados.length === 0 && <li className="px-3 py-3 text-sm text-neutral-500">Nenhum cliente encontrado.</li>}
            </ul>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div className="min-w-0">
              <p className="text-xs text-neutral-500">Cliente</p>
              <p className="font-medium text-neutral-900 break-words">{nomeCliente(cliente)}</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => setCliente(null)}>
              Trocar
            </Button>
          </div>
        )}

        <Input label="Nome do planejamento" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={200} />
        <Input label="Kickoff (opcional)" type="date" value={kickoff} onChange={(e) => setKickoff(e.target.value)} />

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={criar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={criar.isPending} disabled={!cliente}>
            Criar planejamento
          </Button>
        </div>
      </form>
    </Modal>
  );
}
