import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { cadastrosApi, planejamentosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { toast } from '../../stores/toastStore';
import { Card } from '../Card';
import { Button } from '../Button';
import { ErrorAlert } from '../ErrorAlert';
import { Avatar } from './Avatar';
import { invalidarPlanejamento, selectCls } from './atividades';
import { useAnalistas } from './useAnalistas';
import { feriadosQueValem, fimDeSemana, fmtHoras, nomeDiaSemana, somar, somarDias } from '../../projetos';
import { formatarData, hojeIso } from '../../labels';
import type { Deslocamento, Planejamento } from '../../types/projetos';

const inputCls =
  'w-full min-h-11 px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-vr-500';
const iconeBtn =
  'h-11 w-11 md:h-8 md:w-8 shrink-0 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500';

interface FormDesloc {
  id: number | null;
  usuarioId: number | '';
  data: string;
  horas: string;
  descricao: string;
}

function Deslocamentos({ p, editavel }: { p: Planejamento; editavel: boolean }) {
  const qc = useQueryClient();
  const analistas = useAnalistas(p.deslocamentos.map((d) => ({ id: d.usuarioId, nome: d.usuarioNome })));
  const [form, setForm] = useState<FormDesloc | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = useMutation({
    mutationFn: (f: FormDesloc) => {
      const req = {
        usuarioId: Number(f.usuarioId),
        data: f.data,
        horas: Number(f.horas.replace(',', '.')),
        descricao: f.descricao.trim() || null,
      };
      return f.id ? planejamentosApi.atualizarDeslocamento(p.id, f.id, req) : planejamentosApi.criarDeslocamento(p.id, req);
    },
    onSuccess: () => {
      setForm(null);
      toast('Deslocamento salvo');
      invalidarPlanejamento(qc, p.id);
    },
    onError: (e) => setErro(mensagemErro(e, 'Não foi possível salvar o deslocamento.')),
  });
  const excluir = useMutation({
    mutationFn: (d: Deslocamento) => planejamentosApi.excluirDeslocamento(p.id, d.id),
    onSuccess: () => invalidarPlanejamento(qc, p.id),
    onError: (e) => toast(mensagemErro(e, 'Não foi possível excluir.'), 'erro'),
  });

  const enviar = () => {
    if (!form) return;
    const horas = Number(form.horas.replace(',', '.'));
    if (!form.usuarioId) return setErro('Escolha o analista.');
    if (!form.data) return setErro('Informe a data.');
    if (!Number.isFinite(horas) || horas <= 0 || horas > 8) return setErro('Horas: de 0 a 8.');
    setErro(null);
    salvar.mutate(form);
  };

  const lista = [...p.deslocamentos].sort((a, b) => a.data.localeCompare(b.data) || a.usuarioNome.localeCompare(b.usuarioNome));
  const total = somar(lista.map((d) => d.horas));

  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-neutral-900">Deslocamentos</h2>
          <p className="text-xs text-neutral-500">Ocupam o dia do analista sem consumir o contrato (contam como viagem).</p>
        </div>
        {editavel && !form && (
          <Button
            size="sm"
            onClick={() => {
              setErro(null);
              setForm({ id: null, usuarioId: '', data: p.kickoff ?? hojeIso(), horas: '', descricao: '' });
            }}
          >
            <Plus size={16} aria-hidden="true" /> Deslocamento
          </Button>
        )}
      </div>

      {form && (
        <form
          className="mt-3 rounded-lg border border-vr-200 bg-vr-50/40 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_10rem_6rem_minmax(0,1.4fr)] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <select
            aria-label="Analista"
            className={selectCls}
            value={form.usuarioId}
            onChange={(e) => setForm({ ...form, usuarioId: e.target.value ? Number(e.target.value) : '' })}
          >
            <option value="">Analista…</option>
            {analistas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <input aria-label="Data" type="date" className={inputCls} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          <input
            aria-label="Horas"
            placeholder="Horas"
            inputMode="decimal"
            className={inputCls}
            value={form.horas}
            onChange={(e) => setForm({ ...form, horas: e.target.value })}
          />
          <input
            aria-label="Descrição"
            placeholder="Descrição (opcional)"
            className={inputCls}
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            maxLength={200}
          />
          {form.data && fimDeSemana(form.data) && (
            <p className="sm:col-span-2 lg:col-span-4 text-xs text-amber-700">Fim de semana: não ocupa dia útil.</p>
          )}
          {erro && (
            <div className="sm:col-span-2 lg:col-span-4">
              <ErrorAlert>{erro}</ErrorAlert>
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setForm(null)} disabled={salvar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={salvar.isPending}>
              {form.id ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">Nenhum deslocamento.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100">
          {lista.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2">
              <Avatar id={d.usuarioId} nome={d.usuarioNome} tamanho="md" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-900">
                  <span className="font-medium">{d.usuarioNome}</span> · {nomeDiaSemana(d.data)} {formatarData(d.data)} ·{' '}
                  <span className="tabular-nums">{fmtHoras(d.horas)}</span>
                </p>
                {d.descricao && <p className="text-xs text-neutral-500 break-words">{d.descricao}</p>}
              </div>
              {editavel && (
                <div className="flex shrink-0">
                  <button
                    type="button"
                    className={iconeBtn}
                    aria-label={`Editar deslocamento de ${d.usuarioNome}`}
                    onClick={() => {
                      setErro(null);
                      setForm({ id: d.id, usuarioId: d.usuarioId, data: d.data, horas: String(d.horas), descricao: d.descricao ?? '' });
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className={`${iconeBtn} hover:!text-red-600 hover:!bg-red-50`}
                    aria-label={`Excluir deslocamento de ${d.usuarioNome}`}
                    disabled={excluir.isPending}
                    onClick={() => excluir.mutate(d)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
          <li className="pt-2 text-right text-sm text-neutral-600">
            Total: <span className="font-semibold tabular-nums text-neutral-900">{fmtHoras(total)}</span>
          </li>
        </ul>
      )}
    </Card>
  );
}

function FeriadosExtras({ p, editavel }: { p: Planejamento; editavel: boolean }) {
  const qc = useQueryClient();
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const criar = useMutation({
    mutationFn: () => planejamentosApi.criarFeriadoExtra(p.id, { data, descricao: descricao.trim() || null }),
    onSuccess: () => {
      setData('');
      setDescricao('');
      invalidarPlanejamento(qc, p.id);
    },
  });
  const excluir = useMutation({
    mutationFn: (id: number) => planejamentosApi.excluirFeriadoExtra(p.id, id),
    onSuccess: () => invalidarPlanejamento(qc, p.id),
    onError: (e) => toast(mensagemErro(e, 'Não foi possível excluir.'), 'erro'),
  });
  const extras = [...p.feriadosExtras].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <Card>
      <h2 className="font-semibold text-neutral-900">Feriados extras</h2>
      <p className="text-xs text-neutral-500">Só deste planejamento (ex.: ponto facultativo, aniversário da loja).</p>
      {editavel && (
        <form
          className="mt-3 grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)_auto] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (data) criar.mutate();
          }}
        >
          <input aria-label="Data do feriado" type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
          <input
            aria-label="Descrição do feriado"
            placeholder="Descrição (opcional)"
            className={inputCls}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={200}
          />
          <Button type="submit" size="sm" loading={criar.isPending} disabled={!data}>
            <Plus size={16} aria-hidden="true" /> Adicionar
          </Button>
        </form>
      )}
      {criar.error && (
        <div className="mt-2">
          <ErrorAlert>{mensagemErro(criar.error, 'Não foi possível adicionar o feriado.')}</ErrorAlert>
        </div>
      )}
      {extras.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Nenhum feriado extra.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100">
          {extras.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2">
              <span className="text-sm tabular-nums text-neutral-900 w-24 shrink-0">{formatarData(f.data)}</span>
              <span className="text-sm text-neutral-600 flex-1 min-w-0 break-words">{f.descricao || '—'}</span>
              {editavel && (
                <button
                  type="button"
                  className={`${iconeBtn} hover:!text-red-600 hover:!bg-red-50`}
                  aria-label={`Excluir feriado de ${formatarData(f.data)}`}
                  disabled={excluir.isPending}
                  onClick={() => excluir.mutate(f.id)}
                >
                  <X size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Os feriados que o cálculo vai considerar: do kickoff (ou hoje) até o término calculado, no mínimo 6 meses. */
function FeriadosQueValem({ p, editor }: { p: Planejamento; editor: boolean }) {
  const { data: cadastro, error } = useQuery({
    queryKey: ['projetos', 'feriados', 'todos'],
    queryFn: () => cadastrosApi.feriados(),
    enabled: editor,
  });
  const de = p.kickoff ?? hojeIso();
  const minimo = somarDias(de, 183);
  const ate = p.calculo?.termino && p.calculo.termino > minimo ? p.calculo.termino : minimo;
  const validos = feriadosQueValem(cadastro ?? [], p.feriadosExtras, p).filter(
    (f) => f.data >= de && f.data <= ate && !fimDeSemana(f.data)
  );
  const local = p.clienteCidade ? `${p.clienteCidade}/${p.clienteUf}` : p.clienteUf;

  return (
    <Card>
      <h2 className="font-semibold text-neutral-900">Feriados que vão valer</h2>
      <p className="text-xs text-neutral-500">
        De {formatarData(de)} a {formatarData(ate)}, em dias úteis: nacionais
        {local ? `, locais de ${local}` : ' (cliente sem UF: nenhum local)'} e os extras deste planejamento.
      </p>
      {!editor && <p className="mt-3 text-sm text-neutral-500">Os feriados do cadastro aparecem só para a equipe de projetos.</p>}
      {error && (
        <div className="mt-2">
          <ErrorAlert>{mensagemErro(error, 'Não foi possível carregar os feriados.')}</ErrorAlert>
        </div>
      )}
      {validos.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Nenhum feriado em dia útil no período.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-100">
          {validos.map((f, i) => (
            <li key={`${f.data}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2 text-sm">
              <span className="tabular-nums text-neutral-900 w-32 shrink-0">
                {nomeDiaSemana(f.data)} {formatarData(f.data)}
              </span>
              <span className="text-neutral-700 flex-1 min-w-0 break-words">{f.descricao}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  f.origem === 'Nacional'
                    ? 'bg-neutral-100 text-neutral-600'
                    : f.origem === 'Local'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-vr-50 text-vr-800'
                }`}
              >
                {f.origem}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function AbaDeslocamentos({ p, editavel, editor }: { p: Planejamento; editavel: boolean; editor: boolean }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Deslocamentos p={p} editavel={editavel} />
        <FeriadosExtras p={p} editavel={editavel} />
      </div>
      <FeriadosQueValem p={p} editor={editor} />
    </div>
  );
}
