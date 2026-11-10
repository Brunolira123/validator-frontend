import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Pencil, Phone, Plus, UserRound } from 'lucide-react';
import { cadastrosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { toast } from '../../stores/toastStore';
import { Card } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';
import { Modal } from '../Modal';
import { ErrorAlert } from '../ErrorAlert';
import { BotaoExcluir, ConfirmarExclusao } from '../ConfirmarExclusao';
import { Marcar } from './Campos';
import type { Contato } from '../../types/projetos';

type Form = { id: number | null; nome: string; email: string; telefone: string; setor: string; ativo: boolean };

function ContatoModal({ clienteId, inicial, onClose }: { clienteId: number; inicial: Form; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const salvar = useMutation({
    mutationFn: () => {
      const req = {
        nome: f.nome.trim(),
        email: f.email.trim() || null,
        telefone: f.telefone.trim() || null,
        setor: f.setor.trim() || null,
        ativo: f.ativo,
      };
      return f.id ? cadastrosApi.atualizarContato(f.id, req) : cadastrosApi.criarContato(clienteId, req);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projetos', 'contatos', clienteId] });
      toast('Contato salvo');
      onClose();
    },
    onError: (e) => setErro(mensagemErro(e, 'Não foi possível salvar o contato.')),
  });

  return (
    <Modal title={f.id ? 'Editar contato' : 'Novo contato'} onClose={onClose}>
      <form
        className="p-4 sm:p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.nome.trim()) return setErro('Informe o nome.');
          setErro(null);
          salvar.mutate();
        }}
      >
        <Input label="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus maxLength={150} />
        <Input label="Setor" placeholder="Ex.: Compras, TI, Fiscal" value={f.setor} onChange={(e) => setF({ ...f, setor: e.target.value })} maxLength={100} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="E-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={150} />
          <Input label="Telefone" type="tel" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} maxLength={30} />
        </div>
        {f.id && (
          <Marcar checked={f.ativo} onChange={(ativo) => setF({ ...f, ativo })} dica="Inativo não aparece para novas atividades do cliente.">
            Ativo
          </Marcar>
        )}
        {erro && <ErrorAlert>{erro}</ErrorAlert>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={salvar.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Contatos do cliente: quem responde pelas atividades do cliente no cronograma. */
export function AbaContatos({ clienteId, clienteNome }: { clienteId: number; clienteNome: string }) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Form | null>(null);
  const [inativando, setInativando] = useState<Contato | null>(null);

  const { data: contatos, isLoading, error } = useQuery({
    queryKey: ['projetos', 'contatos', clienteId],
    queryFn: () => cadastrosApi.contatos(clienteId, false),
  });
  const inativar = useMutation({
    mutationFn: (id: number) => cadastrosApi.inativarContato(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projetos', 'contatos', clienteId] });
      setInativando(null);
      toast('Contato inativado');
    },
  });

  const lista = [...(contatos ?? [])].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-neutral-900">Contatos de {clienteNome}</h2>
          <p className="text-xs text-neutral-500">Valem para todos os planejamentos deste cliente.</p>
        </div>
        <Button size="sm" onClick={() => setEditando({ id: null, nome: '', email: '', telefone: '', setor: '', ativo: true })}>
          <Plus size={16} aria-hidden="true" /> Contato
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorAlert>{mensagemErro(error, 'Não foi possível carregar os contatos.')}</ErrorAlert>
        </div>
      )}
      {isLoading && <p className="mt-3 text-sm text-neutral-500">Carregando…</p>}
      {contatos && lista.length === 0 && <p className="mt-4 text-sm text-neutral-500">Nenhum contato cadastrado.</p>}

      <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        {lista.map((c) => (
          <li key={c.id} className={`rounded-lg border border-neutral-200 p-3 ${c.ativo ? '' : 'opacity-60'}`}>
            <div className="flex items-start gap-2">
              <UserRound size={18} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-900 break-words">
                  {c.nome}
                  {c.setor && <span className="font-normal text-neutral-500"> · {c.setor}</span>}
                  {!c.ativo && <span className="ml-1.5 text-xs font-medium text-neutral-500">(inativo)</span>}
                </p>
                {c.email && (
                  <a href={`mailto:${c.email}`} className="mt-1 flex items-center gap-1.5 text-sm text-vr-700 hover:underline break-all">
                    <Mail size={14} aria-hidden="true" /> {c.email}
                  </a>
                )}
                {c.telefone && (
                  <a href={`tel:${c.telefone}`} className="mt-1 flex items-center gap-1.5 text-sm text-vr-700 hover:underline">
                    <Phone size={14} aria-hidden="true" /> {c.telefone}
                  </a>
                )}
              </div>
              <button
                type="button"
                aria-label={`Editar ${c.nome}`}
                onClick={() =>
                  setEditando({ id: c.id, nome: c.nome, email: c.email ?? '', telefone: c.telefone ?? '', setor: c.setor ?? '', ativo: c.ativo })
                }
                className="h-11 w-11 md:h-9 md:w-9 shrink-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <Pencil size={16} />
              </button>
              {c.ativo && <BotaoExcluir rotulo={`Inativar ${c.nome}`} onClick={() => setInativando(c)} />}
            </div>
          </li>
        ))}
      </ul>

      {editando && <ContatoModal clienteId={clienteId} inicial={editando} onClose={() => setEditando(null)} />}
      {inativando && (
        <ConfirmarExclusao
          titulo="Inativar contato?"
          rotuloConfirmar="Inativar"
          aviso="Continua nas atividades que já usam o contato e pode ser reativado em Editar."
          onConfirmar={() => inativar.mutate(inativando.id)}
          onCancelar={() => setInativando(null)}
          excluindo={inativar.isPending}
          erro={inativar.error ? mensagemErro(inativar.error, 'Não foi possível inativar.') : null}
        >
          <p>
            <strong>{inativando.nome}</strong> deixa de aparecer nas novas atividades do cliente.
          </p>
        </ConfirmarExclusao>
      )}
    </Card>
  );
}
