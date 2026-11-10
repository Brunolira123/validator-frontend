import { achatar } from '../../projetos';
import type { TemplateAtividade } from '../../types/projetos';
import { arvoreDe, type AtividadeEditavel } from './atividades';

export const paraEditavelTemplate = (a: TemplateAtividade, i: number): AtividadeEditavel => ({
  chave: a.chave,
  chavePai: a.chavePai,
  nome: a.nome,
  categoriaId: a.categoriaId,
  horas: a.horas,
  dependeDe: a.dependeDe ?? [],
  indivisivel: a.indivisivel,
  doCliente: a.doCliente,
  diasCliente: a.diasCliente || 1,
  ordem: a.ordem ?? i,
});

/** Na ordem em que aparecem na árvore; a `ordem` vira a posição (1, 2, 3…). */
export function paraTemplateAtividades(itens: AtividadeEditavel[]): TemplateAtividade[] {
  return achatar(arvoreDe(itens)).map((n, i) => ({
    chave: n.item.chave,
    chavePai: n.item.chavePai,
    nome: n.item.nome,
    categoriaId: n.item.doCliente ? null : n.item.categoriaId,
    horas: n.item.doCliente ? null : n.item.horas,
    dependeDe: n.item.dependeDe,
    indivisivel: n.item.indivisivel,
    doCliente: n.item.doCliente,
    diasCliente: n.item.diasCliente,
    ordem: i + 1,
  }));
}

/** Chave nova e curta que ainda não existe ("a1", "a2"…). */
export function novaChave(itens: AtividadeEditavel[]) {
  const usadas = new Set(itens.map((a) => a.chave));
  let n = itens.length + 1;
  while (usadas.has(`a${n}`)) n++;
  return `a${n}`;
}
