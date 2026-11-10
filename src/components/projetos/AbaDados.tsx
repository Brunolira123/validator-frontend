import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { planejamentosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { toast } from '../../stores/toastStore';
import { Card } from '../Card';
import { Button } from '../Button';
import { Input } from '../Input';
import { ErrorAlert } from '../ErrorAlert';
import { Campo } from './Campos';
import { SituacaoPlanejamentoBadge } from './SituacaoPlanejamentoBadge';
import { invalidarPlanejamento, selectCls } from './atividades';
import { useAnalistas } from './useAnalistas';
import { situacaoEditavel, situacaoLabel, transicoes, instante } from '../../projetos';
import { formatarDataHora } from '../../labels';
import type { Planejamento, SituacaoPlanejamento } from '../../types/projetos';

const txt = (n: number | null) => (n == null ? '' : String(n));
/** "" → null; "85,5" → 85.5; inválido → NaN. */
const num = (s: string) => {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export function AbaDados({ p, editor }: { p: Planejamento; editor: boolean }) {
  const qc = useQueryClient();
  const editavel = editor && situacaoEditavel(p.situacao);
  const analistas = useAnalistas(p.responsavelId && p.responsavelNome ? [{ id: p.responsavelId, nome: p.responsavelNome }] : []);

  const [form, setForm] = useState({
    nome: p.nome,
    kickoff: p.kickoff ?? '',
    horasContratadas: txt(p.horasContratadas),
    custoHoraServico: txt(p.custoHoraServico),
    custoHoraViagem: txt(p.custoHoraViagem),
    responsavelId: p.responsavelId ?? ('' as number | ''),
    observacao: p.observacao ?? '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = useMutation({
    mutationFn: () => {
      const numeros = {
        horasContratadas: num(form.horasContratadas),
        custoHoraServico: num(form.custoHoraServico),
        custoHoraViagem: num(form.custoHoraViagem),
      };
      return planejamentosApi.atualizar(p.id, {
        nome: form.nome.trim(),
        levantamentoId: p.levantamentoId,
        kickoff: form.kickoff || null,
        ...numeros,
        responsavelId: form.responsavelId || null,
        observacao: form.observacao.trim() || null,
      });
    },
    onSuccess: (novo) => {
      qc.setQueryData(['projetos', 'planejamento', p.id], novo);
      invalidarPlanejamento(qc, p.id);
      toast('Dados salvos');
    },
    onError: (e) => setErro(mensagemErro(e, 'Não foi possível salvar.')),
  });

  const mudarSituacao = useMutation({
    mutationFn: (s: SituacaoPlanejamento) => planejamentosApi.mudarSituacao(p.id, s),
    onSuccess: (novo) => {
      qc.setQueryData(['projetos', 'planejamento', p.id], novo);
      invalidarPlanejamento(qc, p.id);
      toast(`Situação: ${situacaoLabel[novo.situacao]}`);
    },
  });

  const enviar = () => {
    if (!form.nome.trim()) return setErro('Informe o nome.');
    const invalidos = (['horasContratadas', 'custoHoraServico', 'custoHoraViagem'] as const).filter((k) => {
      const n = num(form[k]);
      return n !== null && (Number.isNaN(n) || n < 0);
    });
    if (invalidos.length) return setErro('Horas e custos precisam ser números maiores ou iguais a zero.');
    setErro(null);
    salvar.mutate();
  };

  // ENVIADO exige cálculo em dia
  const semCalculoEmDia = !p.calculo || p.calculoDesatualizado;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 items-start">
      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (editavel) enviar();
          }}
        >
          <fieldset disabled={!editavel} className="space-y-4">
            <Input label="Nome" value={form.nome} onChange={(e) => set('nome', e.target.value)} maxLength={200} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Kickoff" type="date" value={form.kickoff} onChange={(e) => set('kickoff', e.target.value)} hint="O cálculo começa nesta data." />
              <Input
                label="Horas contratadas"
                inputMode="decimal"
                value={form.horasContratadas}
                onChange={(e) => set('horasContratadas', e.target.value)}
              />
              <Input
                label="Custo/h serviço (R$)"
                inputMode="decimal"
                value={form.custoHoraServico}
                onChange={(e) => set('custoHoraServico', e.target.value)}
              />
              <Input
                label="Custo/h viagem (R$)"
                inputMode="decimal"
                value={form.custoHoraViagem}
                onChange={(e) => set('custoHoraViagem', e.target.value)}
              />
            </div>
            <Campo rotulo="Responsável pelo planejamento" htmlFor="dados-resp">
              <select
                id="dados-resp"
                className={selectCls}
                value={form.responsavelId}
                onChange={(e) => set('responsavelId', e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Sem responsável</option>
                {analistas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <div>
              <label htmlFor="dados-obs" className="block text-sm font-medium text-neutral-700 mb-1">
                Observação
              </label>
              <textarea
                id="dados-obs"
                rows={4}
                value={form.observacao}
                onChange={(e) => set('observacao', e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vr-500 disabled:bg-neutral-50"
              />
            </div>
          </fieldset>

          {erro && <ErrorAlert>{erro}</ErrorAlert>}
          {editavel && (
            <div className="flex justify-end">
              <Button type="submit" loading={salvar.isPending} className="w-full sm:w-auto">
                Salvar dados
              </Button>
            </div>
          )}
        </form>
      </Card>

      <div className="space-y-4">
        <Card>
          <h2 className="font-semibold text-neutral-900">Situação</h2>
          <div className="mt-2">
            <SituacaoPlanejamentoBadge situacao={p.situacao} doLto={!!p.levantamentoId} />
          </div>
          {editor && transicoes[p.situacao].length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-neutral-500">Mudar para</p>
              {transicoes[p.situacao].map((s) => {
                const bloqueado = s === 'ENVIADO' && semCalculoEmDia;
                return (
                  <div key={s}>
                    <Button
                      variant="secondary"
                      className={`w-full justify-between ${s === 'CANCELADO' ? 'text-red-700' : ''}`}
                      disabled={bloqueado || mudarSituacao.isPending}
                      onClick={() => mudarSituacao.mutate(s)}
                    >
                      {situacaoLabel[s]}
                      <ArrowRight size={16} aria-hidden="true" />
                    </Button>
                    {bloqueado && (
                      <p className="mt-1 text-xs text-neutral-500">
                        {p.calculo ? 'Recalcule o cronograma antes de enviar.' : 'Calcule o cronograma antes de enviar.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {mudarSituacao.error && (
            <div className="mt-3">
              <ErrorAlert>{mensagemErro(mudarSituacao.error, 'Não foi possível mudar a situação.')}</ErrorAlert>
            </div>
          )}
        </Card>
        <Card className="text-sm text-neutral-600 space-y-1">
          <p>
            <span className="text-neutral-500">Cliente:</span> {p.clienteNome}
            {p.clienteCidade && ` · ${p.clienteCidade}/${p.clienteUf}`}
          </p>
          {p.levantamentoId && (
            <p>
              <span className="text-neutral-500">Origem:</span> LTO #{p.levantamentoId}
            </p>
          )}
          <p>
            <span className="text-neutral-500">Criado em:</span> {formatarDataHora(instante(p.criadoEm))}
          </p>
          <p>
            <span className="text-neutral-500">Atualizado em:</span> {formatarDataHora(instante(p.atualizadoEm))}
          </p>
        </Card>
      </div>
    </div>
  );
}
