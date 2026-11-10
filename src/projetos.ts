import type { Perfil } from './types/api';
import type { Feriado, FeriadoExtra, Planejamento, SituacaoPlanejamento } from './types/projetos';

export const situacaoLabel: Record<SituacaoPlanejamento, string> = {
  RASCUNHO: 'Rascunho',
  EM_PLANEJAMENTO: 'Em planejamento',
  ENVIADO: 'Enviado ao cliente',
  CRIADO_ARTIA: 'Criado no Artia',
  CANCELADO: 'Cancelado',
};

export const situacoes = Object.keys(situacaoLabel) as SituacaoPlanejamento[];

/** Transições aceitas pelo backend (o resto é 409). ENVIADO ainda exige cálculo em dia. */
export const transicoes: Record<SituacaoPlanejamento, SituacaoPlanejamento[]> = {
  RASCUNHO: ['EM_PLANEJAMENTO', 'CANCELADO'],
  EM_PLANEJAMENTO: ['ENVIADO', 'CANCELADO'],
  ENVIADO: ['EM_PLANEJAMENTO', 'CRIADO_ARTIA', 'CANCELADO'],
  CRIADO_ARTIA: ['CANCELADO'],
  CANCELADO: ['EM_PLANEJAMENTO'],
};

/** Perfis que editam, calculam e mantêm os cadastros. COMERCIAL só lê os planejamentos dele. */
export const perfisEditores: Perfil[] = ['PROJETOS', 'ADMIN', 'DIRETORIA'];
export const ehEditor = (perfil?: Perfil) => !!perfil && perfisEditores.includes(perfil);

/** CRIADO_ARTIA e CANCELADO são somente leitura: edição e cálculo dão 409. */
export const situacaoEditavel = (s: SituacaoPlanejamento) => s !== 'CRIADO_ARTIA' && s !== 'CANCELADO';

export function iniciais(nome?: string | null) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

// Cor estável por pessoa (mesmo analista, mesma cor em todas as telas)
const coresAvatar = [
  'bg-violet-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-teal-600',
  'bg-fuchsia-600',
  'bg-indigo-600',
];
export const corAvatar = (id: number) => coresAvatar[Math.abs(id) % coresAvatar.length];

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const moedaCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 4.5 → "4,5h". */
export const fmtHoras = (h: number | null | undefined) => `${numero.format(h ?? 0)}h`;
export const fmtNumero = (n: number) => numero.format(n);
/** Sem centavos quando o valor é redondo. */
export const fmtMoeda = (v: number | null | undefined) =>
  Number.isInteger(v ?? 0) ? moeda.format(v ?? 0) : moedaCentavos.format(v ?? 0);

/** Soma com 2 casas, sem o lixo de ponto flutuante (0.1 + 0.2). */
export const somar = (valores: number[]) => Math.round(valores.reduce((a, b) => a + b, 0) * 100) / 100;

/** Sem acento e minúsculo: "São Paulo" = "sao paulo". */
export const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// ---------- Datas (LocalDate "aaaa-mm-dd", sempre em UTC para não andar um dia) ----------

export const paraData = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const paraIso = (d: Date) => d.toISOString().slice(0, 10);
export function somarDias(iso: string, dias: number) {
  const d = paraData(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return paraIso(d);
}
export const fimDeSemana = (iso: string) => {
  const dia = paraData(iso).getUTCDay();
  return dia === 0 || dia === 6;
};
const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
export const nomeDiaSemana = (iso: string) => diaSemana.format(paraData(iso)).replace('.', '');

/** Dias de segunda a sexta entre `de` e `ate`, inclusive. */
export function diasDaSemana(de: string, ate: string): string[] {
  const dias: string[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) if (!fimDeSemana(d)) dias.push(d);
  return dias;
}

export interface FeriadoValido {
  data: string;
  descricao: string;
  origem: 'Nacional' | 'Local' | 'Do planejamento';
}

/**
 * Os feriados que o cálculo considera para este planejamento: nacionais, locais da UF (sem cidade) ou da cidade
 * do cliente (comparada sem acento e sem maiúsculas) e os extras do próprio planejamento.
 */
export function feriadosQueValem(
  cadastro: Feriado[],
  extras: FeriadoExtra[],
  cliente: Pick<Planejamento, 'clienteCidade' | 'clienteUf'>
): FeriadoValido[] {
  const uf = cliente.clienteUf?.toUpperCase() ?? null;
  const cidade = cliente.clienteCidade ? normalizar(cliente.clienteCidade) : null;
  const doCadastro = cadastro
    .filter(
      (f) =>
        f.escopo === 'NACIONAL' ||
        (!!uf && f.uf?.toUpperCase() === uf && (!f.cidade || (!!cidade && normalizar(f.cidade) === cidade)))
    )
    .map<FeriadoValido>((f) => ({
      data: f.data,
      descricao: f.cidade ? `${f.descricao} (${f.cidade})` : f.descricao,
      origem: f.escopo === 'NACIONAL' ? 'Nacional' : 'Local',
    }));
  const doPlanejamento = extras.map<FeriadoValido>((f) => ({
    data: f.data,
    descricao: f.descricao || 'Feriado extra',
    origem: 'Do planejamento',
  }));
  return [...doCadastro, ...doPlanejamento].sort((a, b) => a.data.localeCompare(b.data));
}

// ---------- Árvore de atividades ----------

export interface NoArvore<T> {
  item: T;
  filhos: NoArvore<T>[];
  nivel: number;
}

/**
 * Monta a árvore a partir de uma lista plana (pai → filhos), cada nível na ordem informada.
 * Item cujo pai não existe na lista vira raiz, para nunca sumir da tela.
 */
export function montarArvore<T>(
  itens: T[],
  chave: (t: T) => string,
  chavePai: (t: T) => string | null,
  ordem: (t: T) => number
): NoArvore<T>[] {
  const chaves = new Set(itens.map(chave));
  const porPai = new Map<string | null, T[]>();
  for (const it of itens) {
    const pai = chavePai(it);
    const k = pai && chaves.has(pai) ? pai : null;
    porPai.set(k, [...(porPai.get(k) ?? []), it]);
  }
  const visitados = new Set<string>();
  const construir = (pai: string | null, nivel: number): NoArvore<T>[] =>
    (porPai.get(pai) ?? [])
      .slice()
      .sort((a, b) => ordem(a) - ordem(b))
      .filter((it) => !visitados.has(chave(it)))
      .map((it) => {
        visitados.add(chave(it));
        return { item: it, nivel, filhos: construir(chave(it), nivel + 1) };
      });
  return construir(null, 0);
}

/** Percorre em profundidade (a ordem em que as linhas aparecem). */
export function achatar<T>(nos: NoArvore<T>[]): NoArvore<T>[] {
  return nos.flatMap((n) => [n, ...achatar(n.filhos)]);
}

/** Chaves da própria atividade e de todas as subtarefas (não podem virar pai dela). */
export function descendentes<T>(nos: NoArvore<T>[], chaveAlvo: string, chave: (t: T) => string): Set<string> {
  const alvo = achatar(nos).find((n) => chave(n.item) === chaveAlvo);
  return new Set(alvo ? achatar([alvo]).map((n) => chave(n.item)) : [chaveAlvo]);
}

/**
 * Os carimbos do módulo (calculadoEm, atualizadoEm, criadoEm) vêm como LocalDateTime sem fuso, no relógio do
 * servidor, que roda em UTC. Sem o "Z" o navegador leria como hora local (3h no futuro em Brasília).
 */
export const instante = (s: string) => (/(Z|[+-]\d\d:?\d\d)$/.test(s) ? s : `${s}Z`);
