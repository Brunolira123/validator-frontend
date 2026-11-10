import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CornerDownRight, Pencil, Trash2 } from 'lucide-react';
import { achatar, fmtHoras } from '../../projetos';
import type { Categoria } from '../../types/projetos';
import { Avatar } from './Avatar';
import { arvoreDe, horasDoNo, type AtividadeEditavel, type No } from './atividades';

interface Props {
  itens: AtividadeEditavel[];
  categorias: Categoria[];
  /** Planejamento: mostra responsável, divisão e contato. */
  comPessoas?: boolean;
  nomeAnalista?: (id: number) => string;
  nomeContato?: (id: number) => string | undefined;
  somenteLeitura?: boolean;
  onEditar: (chave: string) => void;
  onNovaSubtarefa: (chavePai: string) => void;
  onExcluir: (chave: string) => void;
  onMover: (chave: string, direcao: -1 | 1) => void;
  movendo?: boolean;
}

const acao =
  'h-11 w-11 md:h-8 md:w-8 shrink-0 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500';

/** Árvore pai/filhos com recolher/expandir. Tabela a partir de lg; no celular, uma linha empilhada por atividade. */
export function ArvoreAtividades({
  itens,
  categorias,
  comPessoas = false,
  nomeAnalista = () => '?',
  nomeContato = () => undefined,
  somenteLeitura = false,
  onEditar,
  onNovaSubtarefa,
  onExcluir,
  onMover,
  movendo = false,
}: Props) {
  const [recolhidos, setRecolhidos] = useState<Set<string>>(() => new Set());
  const arvore = arvoreDe(itens);
  const nomes = new Map(itens.map((a) => [a.chave, a.nome]));
  const categoria = (id: number | null) => categorias.find((c) => c.id === id)?.nome;

  const alternar = (chave: string) =>
    setRecolhidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });

  // Só as linhas visíveis (filhos de um nó recolhido somem)
  const linhas: { no: No; irmaos: No[]; indice: number }[] = [];
  const visitar = (nos: No[]) =>
    nos.forEach((no, indice) => {
      linhas.push({ no, irmaos: nos, indice });
      if (!recolhidos.has(no.item.chave)) visitar(no.filhos);
    });
  visitar(arvore);

  const todos = achatar(arvore);
  const temResumo = todos.some((n) => n.filhos.length > 0);

  if (itens.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-500">Nenhuma atividade ainda.</p>;
  }

  return (
    <div>
      {temResumo && (
        <div className="mb-2 flex justify-end gap-3 text-xs">
          <button type="button" className="text-vr-700 font-medium hover:underline min-h-9" onClick={() => setRecolhidos(new Set())}>
            Expandir tudo
          </button>
          <button
            type="button"
            className="text-vr-700 font-medium hover:underline min-h-9"
            onClick={() => setRecolhidos(new Set(todos.filter((n) => n.filhos.length > 0).map((n) => n.item.chave)))}
          >
            Recolher tudo
          </button>
        </div>
      )}

      <div
        className={`hidden lg:grid gap-x-3 px-2 pb-2 border-b border-neutral-200 text-xs font-medium text-neutral-500 ${
          comPessoas ? 'grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_4.5rem_minmax(0,1.4fr)_minmax(0,1.3fr)_4rem_7.5rem]' : 'grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_4.5rem_minmax(0,1.3fr)_4rem_7.5rem]'
        }`}
      >
        <span>Atividade</span>
        <span>Categoria</span>
        <span className="text-right">Horas</span>
        {comPessoas && <span>Responsável · divisão</span>}
        <span>Depende de</span>
        <span className="text-center">Indivisível</span>
        <span className="sr-only">Ações</span>
      </div>

      <ul className="divide-y divide-neutral-100">
        {linhas.map(({ no, irmaos, indice }) => {
          const a = no.item;
          const resumo = no.filhos.length > 0;
          const recolhido = recolhidos.has(a.chave);
          const horas = horasDoNo(no, categorias);
          const dependencias = a.dependeDe.map((c) => nomes.get(c)).filter(Boolean).join(', ');
          const divisao = a.distribuicao ?? [];

          const pessoas = resumo ? (
            <span className="text-neutral-400">—</span>
          ) : a.doCliente ? (
            <span className="text-neutral-600">
              {a.contatoClienteId ? `Contato: ${nomeContato(a.contatoClienteId) ?? '—'}` : 'Sem contato'} · {a.diasCliente}{' '}
              {a.diasCliente === 1 ? 'dia' : 'dias'}
            </span>
          ) : divisao.length > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              {divisao.map((d) => (
                <span key={d.usuarioId} className="inline-flex items-center gap-1 tabular-nums">
                  <Avatar id={d.usuarioId} nome={nomeAnalista(d.usuarioId)} />
                  {fmtHoras(d.horas)}
                </span>
              ))}
            </span>
          ) : a.responsavelId ? (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Avatar id={a.responsavelId} nome={nomeAnalista(a.responsavelId)} />
              <span className="truncate">{nomeAnalista(a.responsavelId)}</span>
            </span>
          ) : horas > 0 ? (
            <span className="text-amber-700 font-medium">Sem responsável</span>
          ) : (
            <span className="text-neutral-400">—</span>
          );

          return (
            <li
              key={a.chave}
              className={`grid gap-x-3 gap-y-1 px-2 py-2.5 items-center ${
                comPessoas
                  ? 'lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_4.5rem_minmax(0,1.4fr)_minmax(0,1.3fr)_4rem_7.5rem]'
                  : 'lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_4.5rem_minmax(0,1.3fr)_4rem_7.5rem]'
              } ${resumo ? 'bg-neutral-50/60' : ''}`}
            >
              {/* Nome (com recuo do nível) */}
              <div className="flex items-start gap-1 min-w-0" style={{ paddingLeft: `${Math.min(no.nivel, 6) * 1.1}rem` }}>
                {resumo ? (
                  <button
                    type="button"
                    onClick={() => alternar(a.chave)}
                    aria-expanded={!recolhido}
                    aria-label={recolhido ? `Expandir ${a.nome}` : `Recolher ${a.nome}`}
                    className="h-8 w-8 -ml-1 shrink-0 inline-flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                  >
                    {recolhido ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                ) : (
                  <span className="w-7 shrink-0" aria-hidden="true" />
                )}
                <button
                  type="button"
                  onClick={() => onEditar(a.chave)}
                  className="min-h-8 py-1 text-left text-sm text-neutral-900 hover:text-vr-700 hover:underline min-w-0 break-words"
                >
                  <span className={resumo ? 'font-semibold' : ''}>{a.nome}</span>
                  {resumo && <span className="text-neutral-400 font-normal"> (resumo)</span>}
                  {a.doCliente && (
                    <span className="ml-1.5 inline-block align-middle text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      cliente
                    </span>
                  )}
                </button>
              </div>

              {/* Desktop: uma coluna por campo */}
              <span className="hidden lg:block text-sm text-neutral-600 truncate">
                {resumo || a.doCliente ? '—' : (categoria(a.categoriaId) ?? '—')}
              </span>
              <span className="hidden lg:block text-sm text-right tabular-nums text-neutral-900">
                {a.doCliente ? '—' : resumo ? `Σ ${fmtHoras(horas)}` : fmtHoras(horas)}
              </span>
              {comPessoas && <span className="hidden lg:block text-sm min-w-0 overflow-hidden">{pessoas}</span>}
              <span className="hidden lg:block text-sm text-neutral-600 truncate" title={dependencias}>
                {dependencias || '—'}
              </span>
              <span className="hidden lg:block text-center text-sm text-neutral-600">
                {a.indivisivel && !resumo ? '✓' : ''}
              </span>

              {/* Celular: meta numa linha só */}
              <div
                className="lg:hidden flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600"
                style={{ paddingLeft: `${Math.min(no.nivel, 6) * 1.1 + 2}rem` }}
              >
                {!a.doCliente && (
                  <span className="font-semibold tabular-nums text-neutral-900">
                    {resumo ? `Σ ${fmtHoras(horas)}` : fmtHoras(horas)}
                  </span>
                )}
                {!resumo && !a.doCliente && categoria(a.categoriaId) && <span>{categoria(a.categoriaId)}</span>}
                {a.indivisivel && !resumo && <span>indivisível</span>}
                {comPessoas && !resumo && <span className="inline-flex items-center">{pessoas}</span>}
                {dependencias && <span className="basis-full text-neutral-500">Depende de: {dependencias}</span>}
              </div>

              {!somenteLeitura ? (
                <div className="flex items-center justify-end -mr-1">
                  <button
                    type="button"
                    className={acao}
                    onClick={() => onMover(a.chave, -1)}
                    disabled={movendo || indice === 0}
                    aria-label={`Subir ${a.nome}`}
                    title="Subir"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className={acao}
                    onClick={() => onMover(a.chave, 1)}
                    disabled={movendo || indice === irmaos.length - 1}
                    aria-label={`Descer ${a.nome}`}
                    title="Descer"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className={acao}
                    onClick={() => onNovaSubtarefa(a.chave)}
                    aria-label={`Nova subtarefa de ${a.nome}`}
                    title="Nova subtarefa"
                  >
                    <CornerDownRight size={15} />
                  </button>
                  <button type="button" className={`${acao} lg:hidden`} onClick={() => onEditar(a.chave)} aria-label={`Editar ${a.nome}`}>
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className={`${acao} hover:!text-red-600 hover:!bg-red-50`}
                    onClick={() => onExcluir(a.chave)}
                    aria-label={`Excluir ${a.nome}`}
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : (
                <span className="hidden lg:block" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
