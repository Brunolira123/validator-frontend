import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, LayoutTemplate, Plus } from 'lucide-react';
import { cadastrosApi, planejamentosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { toast } from '../../stores/toastStore';
import { Card } from '../Card';
import { Button } from '../Button';
import { ErrorAlert } from '../ErrorAlert';
import { ConfirmarExclusao } from '../ConfirmarExclusao';
import { ArvoreAtividades } from './ArvoreAtividades';
import { AtividadeModal } from './AtividadeModal';
import { EscolherTemplateModal } from './EscolherTemplateModal';
import { arvoreDe, horasTotais, invalidarPlanejamento, type AtividadeEditavel } from './atividades';
import { useAnalistas } from './useAnalistas';
import { achatar, descendentes, fmtHoras, fmtMoeda, somar } from '../../projetos';
import { formatarDiaMes } from '../../labels';
import type { Atividade, AtividadeRequest, Categoria, Planejamento } from '../../types/projetos';

const paraEditavel = (a: Atividade): AtividadeEditavel => ({
  chave: String(a.id),
  chavePai: a.paiId == null ? null : String(a.paiId),
  nome: a.nome,
  categoriaId: a.categoriaId,
  horas: a.horas,
  dependeDe: a.dependeDe.map(String),
  indivisivel: a.indivisivel,
  doCliente: a.doCliente,
  diasCliente: a.diasCliente,
  ordem: a.ordem,
  responsavelId: a.responsavelId,
  distribuicao: a.distribuicao.map((d) => ({ usuarioId: d.usuarioId, horas: d.horas })),
  contatoClienteId: a.contatoClienteId,
});

const paraRequest = (v: AtividadeEditavel, ordem: number | null = null): AtividadeRequest => ({
  nome: v.nome,
  paiId: v.chavePai == null ? null : Number(v.chavePai),
  categoriaId: v.categoriaId,
  horas: v.horas,
  responsavelId: v.responsavelId ?? null,
  indivisivel: v.indivisivel,
  doCliente: v.doCliente,
  diasCliente: v.diasCliente,
  contatoClienteId: v.contatoClienteId ?? null,
  ordem,
});

const mesmaLista = <T,>(a: T[], b: T[], chave: (t: T) => string) =>
  a.length === b.length && a.map(chave).sort().join('|') === b.map(chave).sort().join('|');

/** Painel lateral: planejado × contratado e custo interno estimado (o oficial sai do cálculo). */
function ContratoECustos({ p, horasPlanejadas }: { p: Planejamento; horasPlanejadas: number }) {
  const viagem = somar(p.deslocamentos.map((d) => d.horas));
  const custo = horasPlanejadas * (p.custoHoraServico ?? 0) + viagem * (p.custoHoraViagem ?? 0);
  const saldo = p.horasContratadas != null ? somar([p.horasContratadas, -horasPlanejadas]) : null;
  const conflitos = p.calculo?.conflitos ?? [];
  const linha = (rotulo: string, valor: string) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 last:border-0">
      <span className="text-neutral-600">{rotulo}</span>
      <span className="font-medium text-neutral-900 tabular-nums">{valor}</span>
    </div>
  );

  return (
    <Card className="text-sm 2xl:sticky 2xl:top-4">
      <h2 className="font-semibold text-neutral-900">Contrato e custos</h2>
      <div className="mt-2">
        {linha('Kickoff', p.kickoff ? formatarDiaMes(p.kickoff) : '—')}
        {linha('Horas contratadas', p.horasContratadas != null ? fmtHoras(p.horasContratadas) : '—')}
        {linha('Custo/h serviço', p.custoHoraServico != null ? fmtMoeda(p.custoHoraServico) : '—')}
        {linha('Custo/h viagem', p.custoHoraViagem != null ? fmtMoeda(p.custoHoraViagem) : '—')}
      </div>
      <p className="mt-1 text-xs text-neutral-400">Edite na aba Dados.</p>

      {conflitos.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 space-y-1">
          {conflitos.slice(0, 3).map((c) => (
            <p key={`${c.usuarioId}-${c.semana}`} className="flex gap-1.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {c.mensagem}
            </p>
          ))}
          {conflitos.length > 3 && <p className="text-xs">e mais {conflitos.length - 3} na aba Cronograma.</p>}
          <p className="text-xs text-amber-800">O cálculo considera a carga em todos os projetos.</p>
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        <p>
          <strong>Planejado:</strong> {fmtHoras(horasPlanejadas)} serviço{viagem > 0 && ` · ${fmtHoras(viagem)} viagem`}
        </p>
        {saldo != null && (
          <p className={saldo < 0 ? 'text-red-700 font-medium' : 'text-green-700'}>
            {saldo < 0 ? `${fmtHoras(-saldo)} acima do contrato` : saldo === 0 ? 'Igual ao contrato' : `${fmtHoras(saldo)} de saldo no contrato`}
          </p>
        )}
        <p>
          <strong>Custo interno:</strong> {fmtMoeda(custo)}
        </p>
      </div>
    </Card>
  );
}

export function AbaAtividades({ p, editavel, editor }: { p: Planejamento; editavel: boolean; editor: boolean }) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<{ valor: AtividadeEditavel; novo: boolean } | null>(null);
  const [excluindo, setExcluindo] = useState<Atividade | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroMover, setErroMover] = useState<string | null>(null);
  const [templateAberto, setTemplateAberto] = useState(false);

  // COMERCIAL não lê os cadastros: as categorias saem das próprias atividades
  const { data: categoriasCadastro } = useQuery({
    queryKey: ['projetos', 'categorias'],
    queryFn: () => cadastrosApi.categorias(false),
    enabled: editor,
  });
  const categorias: Categoria[] =
    categoriasCadastro ??
    [...new Map(p.atividades.filter((a) => a.categoriaId).map((a) => [a.categoriaId!, a.categoriaNome ?? ''])).entries()].map(
      ([id, nome]) => ({ id, nome, horasPadrao: 0, ativo: true })
    );

  const { data: contatos } = useQuery({
    queryKey: ['projetos', 'contatos', p.clienteId],
    queryFn: () => cadastrosApi.contatos(p.clienteId, false),
    enabled: editor,
  });

  // Quem já aparece aqui entra na lista mesmo que a carga não traga
  const conhecidos = new Map<number, string>();
  p.atividades.forEach((a) => {
    if (a.responsavelId && a.responsavelNome) conhecidos.set(a.responsavelId, a.responsavelNome);
    a.distribuicao.forEach((d) => conhecidos.set(d.usuarioId, d.usuarioNome));
  });
  const analistas = useAnalistas([...conhecidos].map(([id, nome]) => ({ id, nome })));
  const nomeAnalista = (id: number) => analistas.find((a) => a.id === id)?.nome ?? conhecidos.get(id) ?? '?';

  const itens = p.atividades.map(paraEditavel);
  const horasPlanejadas = horasTotais(itens, categorias);
  const porId = (chave: string) => p.atividades.find((a) => String(a.id) === chave);

  const salvar = async (v: AtividadeEditavel, novo: boolean) => {
    const original = novo ? undefined : porId(v.chave);
    const resumo = !novo && itens.some((a) => a.chavePai === v.chave);
    const req = paraRequest(resumo ? { ...v, horas: original?.horas ?? 0, responsavelId: original?.responsavelId ?? null } : v);
    try {
      const salva = novo
        ? await planejamentosApi.criarAtividade(p.id, req)
        : await planejamentosApi.atualizarAtividade(p.id, Number(v.chave), req);
      const deps = v.dependeDe.map(Number);
      if (!mesmaLista(deps, salva.dependeDe, String)) await planejamentosApi.dependencias(p.id, salva.id, deps);
      const divisao = v.distribuicao ?? [];
      const mudouDivisao = !mesmaLista(divisao, salva.distribuicao, (d) => `${d.usuarioId}:${d.horas}`);
      if (!resumo && !v.doCliente && mudouDivisao) await planejamentosApi.distribuir(p.id, salva.id, divisao);
      toast(novo ? 'Atividade adicionada' : 'Atividade salva');
    } finally {
      // Mesmo com erro no meio (ex.: divisão), o que já gravou precisa aparecer
      invalidarPlanejamento(qc, p.id);
    }
  };

  const mover = async (chave: string, direcao: -1 | 1) => {
    const no = achatar(arvoreDe(itens)).find((n) => n.item.chave === chave);
    if (!no) return;
    const irmaos = itens.filter((a) => a.chavePai === no.item.chavePai).sort((a, b) => a.ordem - b.ordem);
    const i = irmaos.findIndex((a) => a.chave === chave);
    const outro = irmaos[i + direcao];
    if (!outro) return;
    const a = porId(chave)!;
    const b = porId(outro.chave)!;
    // Troca as ordens; se forem iguais, abre um espaço na direção do movimento
    const novaA = a.ordem === b.ordem ? b.ordem + direcao : b.ordem;
    const novaB = a.ordem;
    setOcupado(true);
    setErroMover(null);
    try {
      await planejamentosApi.atualizarAtividade(p.id, a.id, paraRequest(paraEditavel(a), novaA));
      await planejamentosApi.atualizarAtividade(p.id, b.id, paraRequest(paraEditavel(b), novaB));
    } catch (e) {
      setErroMover(mensagemErro(e, 'Não foi possível mudar a ordem.'));
    } finally {
      invalidarPlanejamento(qc, p.id);
      setOcupado(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    setOcupado(true);
    setErroExcluir(null);
    try {
      await planejamentosApi.excluirAtividade(p.id, excluindo.id);
      toast('Atividade excluída');
      setExcluindo(null);
      invalidarPlanejamento(qc, p.id);
    } catch (e) {
      setErroExcluir(mensagemErro(e, 'Não foi possível excluir.'));
    } finally {
      setOcupado(false);
    }
  };

  const nova = (chavePai: string | null): AtividadeEditavel => ({
    chave: '',
    chavePai,
    nome: '',
    categoriaId: null,
    horas: null,
    dependeDe: [],
    indivisivel: false,
    doCliente: false,
    diasCliente: 1,
    ordem: Number.MAX_SAFE_INTEGER,
    responsavelId: null,
    distribuicao: [],
    contatoClienteId: null,
  });

  const subtarefas = excluindo ? descendentes(arvoreDe(itens), String(excluindo.id), (a) => a.chave).size - 1 : 0;
  const podeAplicarTemplate = editavel && (p.situacao === 'RASCUNHO' || p.situacao === 'EM_PLANEJAMENTO');

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_18rem] gap-4 items-start">
      <Card className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-neutral-900">
            Atividades <span className="text-neutral-400 font-normal">({p.atividades.length})</span>
          </h2>
          {editavel && (
            <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
              {podeAplicarTemplate && (
                <Button variant="secondary" size="sm" onClick={() => setTemplateAberto(true)}>
                  <LayoutTemplate size={16} aria-hidden="true" />
                  {p.atividades.length ? 'Trocar template' : 'Escolher template'}
                </Button>
              )}
              <Button size="sm" onClick={() => setEditando({ valor: nova(null), novo: true })}>
                <Plus size={16} aria-hidden="true" /> Atividade
              </Button>
            </div>
          )}
        </div>

        {erroMover && (
          <div className="mb-3">
            <ErrorAlert>{erroMover}</ErrorAlert>
          </div>
        )}

        {p.atividades.length === 0 && podeAplicarTemplate ? (
          <div className="py-10 text-center">
            <p className="font-medium text-neutral-800">Sem atividades ainda</p>
            <p className="mt-1 text-sm text-neutral-500">Comece por um template ou adicione as atividades uma a uma.</p>
            <div className="mt-4">
              <Button onClick={() => setTemplateAberto(true)}>
                <LayoutTemplate size={16} aria-hidden="true" /> Escolher template
              </Button>
            </div>
          </div>
        ) : (
          <ArvoreAtividades
            itens={itens}
            categorias={categorias}
            comPessoas
            nomeAnalista={nomeAnalista}
            nomeContato={(id) => contatos?.find((c) => c.id === id)?.nome ?? p.atividades.find((a) => a.contatoClienteId === id)?.contatoClienteNome ?? undefined}
            somenteLeitura={!editavel}
            movendo={ocupado}
            onEditar={(chave) => {
              const v = itens.find((a) => a.chave === chave);
              if (v) setEditando({ valor: v, novo: false });
            }}
            onNovaSubtarefa={(chave) => setEditando({ valor: nova(chave), novo: true })}
            onExcluir={(chave) => {
              setErroExcluir(null);
              setExcluindo(porId(chave) ?? null);
            }}
            onMover={(chave, d) => void mover(chave, d)}
          />
        )}
        <p className="mt-4 text-xs text-neutral-400">
          Categoria preenche as horas padrão. Resumos somam os filhos. "Indivisível" = não quebra o esforço de uma pessoa em
          dias diferentes.
        </p>
      </Card>

      <ContratoECustos p={p} horasPlanejadas={horasPlanejadas} />

      {editando && (
        <AtividadeModal
          inicial={editando.valor}
          novo={editando.novo}
          itens={itens}
          categorias={categorias}
          modo="planejamento"
          analistas={analistas}
          contatos={(contatos ?? []).filter((c) => c.ativo || c.id === editando.valor.contatoClienteId)}
          somenteLeitura={!editavel}
          onSalvar={(v) => salvar(v, editando.novo)}
          onClose={() => setEditando(null)}
        />
      )}
      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir atividade?"
          onConfirmar={() => void confirmarExclusao()}
          onCancelar={() => setExcluindo(null)}
          excluindo={ocupado}
          erro={erroExcluir}
          aviso="A exclusão é definitiva. As dependências que apontavam para ela também saem."
        >
          <p>
            <strong>{excluindo.nome}</strong>
            {subtarefas > 0 && ` e ${subtarefas} subtarefa(s)`} será(ão) apagada(s).
          </p>
        </ConfirmarExclusao>
      )}
      {templateAberto && (
        <EscolherTemplateModal
          planejamentoId={p.id}
          nomePlanejamento={p.nome}
          temAtividades={p.atividades.length > 0}
          onClose={() => setTemplateAberto(false)}
          onAplicado={() => {
            setTemplateAberto(false);
            toast('Template aplicado');
          }}
        />
      )}
    </div>
  );
}
