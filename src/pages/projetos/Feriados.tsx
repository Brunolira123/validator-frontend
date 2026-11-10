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
import { CidadeCombobox } from '../../components/CidadeCombobox';
import { BotaoExcluir, ConfirmarExclusao } from '../../components/ConfirmarExclusao';
import { Campo } from '../../components/projetos/Campos';
import { selectCls } from '../../components/projetos/atividades';
import { fimDeSemana, nomeDiaSemana } from '../../projetos';
import { formatarData, formatarDiaMes } from '../../labels';
import type { EscopoFeriado, Feriado } from '../../types/projetos';

const UFS = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ');

type Form = { id: number | null; data: string; descricao: string; escopo: EscopoFeriado; uf: string; cidade: string };

function FeriadoModal({ inicial, onClose }: { inicial: Form; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const salvar = useMutation({
    mutationFn: () => {
      const local = f.escopo === 'LOCAL';
      const req = {
        data: f.data,
        descricao: f.descricao.trim(),
        escopo: f.escopo,
        uf: local ? f.uf : null,
        cidade: local && f.cidade.trim() ? f.cidade.trim() : null,
      };
      return f.id ? cadastrosApi.atualizarFeriado(f.id, req) : cadastrosApi.criarFeriado(req);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projetos', 'feriados'] });
      toast('Feriado salvo');
      onClose();
    },
    onError: (e) => setErro(mensagemErro(e, 'Não foi possível salvar o feriado.')),
  });

  return (
    <Modal title={f.id ? 'Editar feriado' : 'Novo feriado'} onClose={onClose}>
      <form
        className="p-4 sm:p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.data) return setErro('Informe a data.');
          if (!f.descricao.trim()) return setErro('Informe a descrição.');
          if (f.escopo === 'LOCAL' && !f.uf) return setErro('Feriado local exige a UF.');
          setErro(null);
          salvar.mutate();
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Data"
            type="date"
            value={f.data}
            onChange={(e) => setF({ ...f, data: e.target.value })}
            hint={f.data && fimDeSemana(f.data) ? 'Cai no fim de semana: não muda o cálculo.' : undefined}
          />
          <Campo rotulo="Abrangência" htmlFor="fer-escopo">
            <select
              id="fer-escopo"
              className={selectCls}
              value={f.escopo}
              onChange={(e) => setF({ ...f, escopo: e.target.value as EscopoFeriado })}
            >
              <option value="NACIONAL">Nacional</option>
              <option value="LOCAL">Local (estado ou cidade)</option>
            </select>
          </Campo>
        </div>
        <Input label="Descrição" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} maxLength={150} />
        {f.escopo === 'LOCAL' && (
          <div className="grid grid-cols-1 sm:grid-cols-[7rem_minmax(0,1fr)] gap-4">
            <Campo rotulo="UF" htmlFor="fer-uf">
              <select id="fer-uf" className={selectCls} value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value, cidade: '' })}>
                <option value="">—</option>
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Campo>
            {f.uf === 'SP' ? (
              <div>
                <CidadeCombobox valor={f.cidade} onChange={(cidade) => setF({ ...f, cidade })} />
                <p className="text-xs text-neutral-500 mt-1">Vazio: vale para o estado inteiro.</p>
              </div>
            ) : (
              <Input
                label="Cidade"
                value={f.cidade}
                onChange={(e) => setF({ ...f, cidade: e.target.value })}
                hint="Vazio: vale para o estado inteiro."
                maxLength={100}
              />
            )}
          </div>
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

export default function Feriados() {
  const qc = useQueryClient();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [escopo, setEscopo] = useState<EscopoFeriado | ''>('');
  const [editando, setEditando] = useState<Form | null>(null);
  const [excluindo, setExcluindo] = useState<Feriado | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['projetos', 'feriados', ano, escopo],
    queryFn: () => cadastrosApi.feriados({ ano, escopo: escopo || undefined }),
  });
  const excluir = useMutation({
    mutationFn: (id: number) => cadastrosApi.excluirFeriado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projetos', 'feriados'] });
      setExcluindo(null);
      toast('Feriado excluído');
    },
  });
  const lista = [...(data ?? [])].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Feriados</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Nacionais e locais. O cálculo usa os nacionais e os da UF/cidade do cliente. Carnaval e Corpus Christi são ponto
            facultativo: cadastre como local quando valerem.
          </p>
        </div>
        <Button
          onClick={() => setEditando({ id: null, data: '', descricao: '', escopo: 'LOCAL', uf: 'SP', cidade: '' })}
          className="w-full sm:w-auto"
        >
          <Plus size={16} aria-hidden="true" /> Novo feriado
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 sm:flex gap-2">
        <select aria-label="Ano" className={`${selectCls} sm:w-32`} value={ano} onChange={(e) => setAno(Number(e.target.value))}>
          {[anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select aria-label="Abrangência" className={`${selectCls} sm:w-48`} value={escopo} onChange={(e) => setEscopo(e.target.value as EscopoFeriado | '')}>
          <option value="">Todos</option>
          <option value="NACIONAL">Nacionais</option>
          <option value="LOCAL">Locais</option>
        </select>
      </div>

      {error && <ErrorAlert>{mensagemErro(error, 'Não foi possível carregar os feriados.')}</ErrorAlert>}
      {isLoading && <div className="h-40 rounded-xl bg-neutral-100 animate-pulse" aria-hidden="true" />}

      {data && (
        <Card className="!p-0 max-w-3xl">
          {lista.length === 0 && <p className="px-5 py-6 text-sm text-neutral-500">Nenhum feriado em {ano}.</p>}
          <ul className="divide-y divide-neutral-100">
            {lista.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 sm:px-5 py-2">
                <span className="w-[4.5rem] sm:w-32 shrink-0 text-sm tabular-nums text-neutral-900 whitespace-nowrap">
                  <span className="text-neutral-500">{nomeDiaSemana(f.data)}</span>{' '}
                  <span className="sm:hidden">{formatarDiaMes(f.data)}</span>
                  <span className="hidden sm:inline">{formatarData(f.data)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-neutral-900">{f.descricao}</span>
                  <span className="block text-xs text-neutral-500">
                    {f.escopo === 'NACIONAL' ? 'Nacional' : f.cidade ? `${f.cidade}/${f.uf}` : `Estado: ${f.uf}`}
                  </span>
                </span>
                <span className="flex shrink-0">
                  <button
                    type="button"
                    aria-label={`Editar ${f.descricao}`}
                    onClick={() =>
                      setEditando({ id: f.id, data: f.data, descricao: f.descricao, escopo: f.escopo, uf: f.uf ?? '', cidade: f.cidade ?? '' })
                    }
                    className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
                  >
                    <Pencil size={16} />
                  </button>
                  <BotaoExcluir rotulo={`Excluir ${f.descricao}`} onClick={() => setExcluindo(f)} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editando && <FeriadoModal inicial={editando} onClose={() => setEditando(null)} />}
      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir feriado?"
          aviso="A exclusão é definitiva. Cálculos já feitos não mudam até serem recalculados."
          onConfirmar={() => excluir.mutate(excluindo.id)}
          onCancelar={() => setExcluindo(null)}
          excluindo={excluir.isPending}
          erro={excluir.error ? mensagemErro(excluir.error, 'Não foi possível excluir.') : null}
        >
          <p>
            <strong>{excluindo.descricao}</strong> ({formatarData(excluindo.data)}).
          </p>
        </ConfirmarExclusao>
      )}
    </div>
  );
}
