import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { cadastrosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { toast } from '../../stores/toastStore';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { ErrorAlert } from '../../components/ErrorAlert';
import { BotaoExcluir, ConfirmarExclusao } from '../../components/ConfirmarExclusao';
import { Marcar } from '../../components/projetos/Campos';
import { fmtHoras } from '../../projetos';
import type { Categoria } from '../../types/projetos';

type Form = { id: number | null; nome: string; horasPadrao: string; ativo: boolean };

function CategoriaModal({ inicial, onClose }: { inicial: Form; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const salvar = useMutation({
    mutationFn: () => {
      const req = { nome: f.nome.trim(), horasPadrao: Number(f.horasPadrao.replace(',', '.')), ativo: f.ativo };
      return f.id ? cadastrosApi.atualizarCategoria(f.id, req) : cadastrosApi.criarCategoria(req);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projetos', 'categorias'] });
      toast('Categoria salva');
      onClose();
    },
    onError: (e) => setErro(mensagemErro(e, 'Não foi possível salvar a categoria.')),
  });

  return (
    <Modal title={f.id ? 'Editar categoria' : 'Nova categoria'} onClose={onClose}>
      <form
        className="p-4 sm:p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const horas = Number(f.horasPadrao.replace(',', '.'));
          if (!f.nome.trim()) return setErro('Informe o nome.');
          if (f.horasPadrao.trim() === '' || !Number.isFinite(horas) || horas < 0) return setErro('Horas padrão: número maior ou igual a zero.');
          setErro(null);
          salvar.mutate();
        }}
      >
        <Input label="Nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus maxLength={100} />
        <Input
          label="Horas padrão"
          inputMode="decimal"
          value={f.horasPadrao}
          onChange={(e) => setF({ ...f, horasPadrao: e.target.value })}
          hint="Preenchem a atividade quando a categoria é escolhida. Mudar aqui não mexe nos planejamentos existentes."
        />
        {f.id && (
          <Marcar checked={f.ativo} onChange={(ativo) => setF({ ...f, ativo })} dica="Inativa não aparece para novas atividades.">
            Ativa
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

export default function Categorias() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Form | null>(null);
  const [inativando, setInativando] = useState<Categoria | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['projetos', 'categorias'],
    queryFn: () => cadastrosApi.categorias(false),
  });
  const inativar = useMutation({
    mutationFn: (id: number) => cadastrosApi.inativarCategoria(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projetos', 'categorias'] });
      setInativando(null);
      toast('Categoria inativada');
    },
  });
  const lista = [...(data ?? [])].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Categorias</h1>
          <p className="text-sm text-neutral-500 mt-1">Tipos de atividade e as horas padrão de cada um.</p>
        </div>
        <Button onClick={() => setEditando({ id: null, nome: '', horasPadrao: '', ativo: true })} className="w-full sm:w-auto">
          <Plus size={16} aria-hidden="true" /> Nova categoria
        </Button>
      </div>

      {error && <ErrorAlert>{mensagemErro(error, 'Não foi possível carregar as categorias.')}</ErrorAlert>}
      {isLoading && <div className="h-40 rounded-xl bg-neutral-100 animate-pulse" aria-hidden="true" />}

      {data && (
        <Card className="!p-0 max-w-2xl">
          <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-3 px-4 sm:px-5 py-2 border-b border-neutral-200 text-xs font-medium text-neutral-500">
            <span>Categoria</span>
            <span className="text-right">Horas padrão</span>
            <span className="w-20 sm:w-[4.5rem]" />
          </div>
          {lista.length === 0 && <p className="px-5 py-6 text-sm text-neutral-500">Nenhuma categoria.</p>}
          <ul className="divide-y divide-neutral-100">
            {lista.map((c) => (
              <li key={c.id} className={`grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-3 items-center px-4 sm:px-5 py-1.5 ${c.ativo ? '' : 'opacity-60'}`}>
                <span className="text-sm text-neutral-900 break-words">
                  {c.nome}
                  {!c.ativo && <span className="ml-1.5 text-xs text-neutral-500">(inativa)</span>}
                </span>
                <span className="text-sm text-right tabular-nums text-neutral-900">{fmtHoras(c.horasPadrao)}</span>
                <span className="flex justify-end w-20 sm:w-[4.5rem]">
                  <button
                    type="button"
                    aria-label={`Editar ${c.nome}`}
                    onClick={() => setEditando({ id: c.id, nome: c.nome, horasPadrao: String(c.horasPadrao), ativo: c.ativo })}
                    className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                  >
                    <Pencil size={16} />
                  </button>
                  {c.ativo && <BotaoExcluir rotulo={`Inativar ${c.nome}`} onClick={() => setInativando(c)} />}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editando && <CategoriaModal inicial={editando} onClose={() => setEditando(null)} />}
      {inativando && (
        <ConfirmarExclusao
          titulo="Inativar categoria?"
          rotuloConfirmar="Inativar"
          aviso="As atividades que já usam a categoria continuam com ela. Dá para reativar em Editar."
          onConfirmar={() => inativar.mutate(inativando.id)}
          onCancelar={() => setInativando(null)}
          excluindo={inativar.isPending}
          erro={inativar.error ? mensagemErro(inativar.error, 'Não foi possível inativar.') : null}
        >
          <p>
            <strong>{inativando.nome}</strong> deixa de aparecer para novas atividades.
          </p>
        </ConfirmarExclusao>
      )}
    </div>
  );
}
