import type { QueryClient } from '@tanstack/react-query';
import { montarArvore, somar, type NoArvore } from '../../projetos';
import type { Categoria } from '../../types/projetos';

/**
 * Forma comum entre a atividade do planejamento e a do template. No planejamento a chave é o id;
 * no template, a chave do próprio template. Os campos de pessoas só existem no planejamento.
 */
export interface AtividadeEditavel {
  chave: string;
  chavePai: string | null;
  nome: string;
  categoriaId: number | null;
  /** null = horas padrão da categoria (só acontece no template). */
  horas: number | null;
  dependeDe: string[];
  indivisivel: boolean;
  doCliente: boolean;
  diasCliente: number;
  ordem: number;
  responsavelId?: number | null;
  distribuicao?: { usuarioId: number; horas: number }[];
  contatoClienteId?: number | null;
}

export type No = NoArvore<AtividadeEditavel>;

export const arvoreDe = (itens: AtividadeEditavel[]) =>
  montarArvore(itens, (a) => a.chave, (a) => a.chavePai, (a) => a.ordem);

/** Horas próprias da atividade folha (no template, null cai nas horas padrão da categoria). */
export function horasProprias(a: AtividadeEditavel, categorias: Categoria[]) {
  if (a.doCliente) return 0;
  if (a.horas != null) return a.horas;
  return categorias.find((c) => c.id === a.categoriaId)?.horasPadrao ?? 0;
}

/** Resumo = Σ dos filhos (as horas dele são ignoradas no cálculo). */
export function horasDoNo(no: No, categorias: Categoria[]): number {
  if (no.filhos.length === 0) return horasProprias(no.item, categorias);
  return somar(no.filhos.map((f) => horasDoNo(f, categorias)));
}

/** Total planejado = Σ das raízes (cada resumo já soma os filhos). */
export const horasTotais = (itens: AtividadeEditavel[], categorias: Categoria[]) =>
  somar(arvoreDe(itens).map((n) => horasDoNo(n, categorias)));

export const selectCls =
  'w-full min-h-11 px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-vr-500 disabled:bg-neutral-50 disabled:text-neutral-500';

/** Depois de qualquer edição: o planejamento aberto e a lista (situação, "desatualizado", atualizado há…). */
export function invalidarPlanejamento(qc: QueryClient, id: number) {
  qc.invalidateQueries({ queryKey: ['projetos', 'planejamento', id] });
  qc.invalidateQueries({ queryKey: ['projetos', 'planejamentos'] });
}
