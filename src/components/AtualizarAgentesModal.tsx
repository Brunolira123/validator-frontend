import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { ErrorAlert } from './ErrorAlert';
import { toast } from '../stores/toastStore';
import { REGEX_VERSAO } from '../versaoAgente';
import type { EscopoVersaoAlvo, SuporteClienteResponse } from '../types/api';

const escopos: { valor: EscopoVersaoAlvo; label: string }[] = [
  { valor: 'PILOTO', label: 'Piloto' },
  { valor: 'TODOS', label: 'Todos' },
  { valor: 'IDS', label: 'Selecionados' },
];

const rotuloEscopo: Record<EscopoVersaoAlvo, string> = {
  PILOTO: 'clientes do piloto',
  TODOS: 'todos os clientes',
  IDS: 'clientes selecionados',
};

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

interface Props {
  /** A lista do Suporte já vem só com clientes ativos, como o backend considera no lote. */
  clientes: SuporteClienteResponse[];
  onClose: () => void;
}

/** Versão alvo do agente em lote (ADMIN/DIRETORIA): o vrip-updater de cada cliente instala na próxima consulta. */
export function AtualizarAgentesModal({ clientes, onClose }: Props) {
  const queryClient = useQueryClient();
  const listaId = useId();
  const [etapa, setEtapa] = useState<'form' | 'confirmar'>('form');
  const [versao, setVersao] = useState('');
  const [erroVersao, setErroVersao] = useState<string | null>(null);
  const [escopo, setEscopo] = useState<EscopoVersaoAlvo>('PILOTO');
  const [selecionados, setSelecionados] = useState<Set<number>>(() => new Set());
  const [erroSelecao, setErroSelecao] = useState<string | null>(null);
  const [busca, setBusca] = useState('');

  const v = versao.trim();
  const doEscopo = clientes.filter((c) =>
    escopo === 'PILOTO' ? c.piloto : escopo === 'IDS' ? selecionados.has(c.id) : true,
  );
  // Mesma regra do backend: quem já roda a versão fica de fora
  const marcaveis = doEscopo.filter((c) => c.versaoAgente !== v);
  const jaNaVersao = doEscopo.length - marcaveis.length;
  const qtdPiloto = clientes.filter((c) => c.piloto).length;

  const termo = normalizar(busca.trim());
  const visiveis = termo ? clientes.filter((c) => normalizar(c.nome).includes(termo)) : clientes;

  const aplicar = useMutation({
    mutationFn: () =>
      monitorApi.definirVersaoAlvoEmLote({ versao: v, escopo, ids: escopo === 'IDS' ? [...selecionados] : undefined }),
    onSuccess: (marcados) => {
      toast(`Versão ${v} definida como alvo de ${marcados} cliente(s).`);
      queryClient.invalidateQueries({ queryKey: ['monitor', 'suporte', 'clientes'] });
      onClose();
    },
  });

  const alternar = (id: number) => {
    setErroSelecao(null);
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const continuar = (e: FormEvent) => {
    e.preventDefault();
    let ok = true;
    if (!REGEX_VERSAO.test(v)) {
      setErroVersao('Use o formato 2.4.1 ou 2.5.0-rc.1');
      ok = false;
    }
    if (escopo === 'IDS' && selecionados.size === 0) {
      setErroSelecao('Selecione pelo menos um cliente');
      ok = false;
    }
    if (ok) setEtapa('confirmar');
  };

  return (
    <Modal title="Atualizar agentes" onClose={onClose} size="2xl">
      {etapa === 'form' ? (
        <form onSubmit={continuar} noValidate className="p-4 sm:p-6 space-y-5">
          <div className="sm:w-60">
            <Input
              label="Versão alvo"
              value={versao}
              onChange={(e) => {
                setVersao(e.target.value);
                setErroVersao(null);
              }}
              placeholder="Ex.: 2.4.1"
              inputMode="decimal"
              autoComplete="off"
              error={erroVersao ?? undefined}
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-neutral-700 mb-1">Escopo</legend>
            <div role="group" className="grid grid-cols-3 sm:inline-grid p-1 rounded-xl bg-neutral-100 border border-neutral-200">
              {escopos.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  aria-pressed={escopo === o.valor}
                  onClick={() => {
                    setEscopo(o.valor);
                    setErroSelecao(null);
                  }}
                  className={`min-h-11 md:min-h-9 px-3 sm:px-4 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
                    escopo === o.valor ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {escopo === 'PILOTO' && `${qtdPiloto} cliente(s) no piloto. Marque o piloto no detalhe de cada cliente.`}
              {escopo === 'TODOS' && `${clientes.length} cliente(s) ativos.`}
              {escopo === 'IDS' && `${selecionados.size} de ${clientes.length} selecionado(s).`}
            </p>
          </fieldset>

          {escopo === 'IDS' && (
            <div>
              <div className="relative">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente"
                  aria-label="Buscar cliente para selecionar"
                  aria-controls={listaId}
                  className="w-full min-h-11 pl-9 pr-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vr-500"
                />
              </div>
              <ul
                id={listaId}
                aria-label="Clientes"
                className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-neutral-200 divide-y divide-neutral-100"
              >
                {visiveis.length === 0 && <li className="px-3 py-4 text-sm text-neutral-500">Nenhum cliente encontrado.</li>}
                {visiveis.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-3 min-h-11 px-3 py-2 cursor-pointer hover:bg-neutral-50">
                      <input
                        type="checkbox"
                        checked={selecionados.has(c.id)}
                        onChange={() => alternar(c.id)}
                        className="h-4 w-4 shrink-0 accent-vr-600"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">{c.nome}</span>
                      <span className="shrink-0 text-xs text-neutral-500 tabular-nums">{c.versaoAgente ?? '—'}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {erroSelecao && <p className="text-xs text-red-500 mt-1">{erroSelecao}</p>}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Continuar</Button>
          </div>
        </form>
      ) : (
        <div className="p-4 sm:p-6 space-y-4">
          {marcaveis.length > 0 ? (
            <>
              <p className="text-base text-neutral-900">
                Definir a versão <span className="font-semibold tabular-nums">{v}</span> como alvo de{' '}
                <span className="font-semibold">{marcaveis.length} cliente(s)</span> ({rotuloEscopo[escopo]})?
              </p>
              <p className="text-sm text-neutral-500">
                O updater de cada cliente instala na próxima consulta.
                {jaNaVersao > 0 && ` ${jaNaVersao} cliente(s) já na ${v} ficam de fora.`}
              </p>
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-neutral-200 divide-y divide-neutral-100 text-sm">
                {marcaveis.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-neutral-800">{c.nome}</span>
                    <span className="shrink-0 text-xs text-neutral-500 tabular-nums">
                      {c.versaoAgente ?? '—'} → {v}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-neutral-600">
              Nenhum cliente para marcar: {doEscopo.length === 0 ? `não há ${rotuloEscopo[escopo]}` : `todos já estão na ${v}`}.
            </p>
          )}

          {aplicar.error && <ErrorAlert>{mensagemErro(aplicar.error, 'Erro ao definir a versão alvo')}</ErrorAlert>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="secondary" onClick={() => setEtapa('form')} disabled={aplicar.isPending}>
              Voltar
            </Button>
            <Button onClick={() => aplicar.mutate()} loading={aplicar.isPending} disabled={marcaveis.length === 0}>
              Atualizar {marcaveis.length} cliente(s)
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
