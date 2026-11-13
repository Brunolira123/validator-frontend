import type { FiltroClientes, SituacaoMonitor } from '../../types/api';

/** Situações que a lista filtra (INATIVO entra pelo "Mostrar inativos"). */
export const situacoesFiltro: { valor: SituacaoMonitor; label: string }[] = [
  { valor: 'FALHA', label: 'Falha' },
  { valor: 'OFFLINE', label: 'Offline' },
  { valor: 'AGUARDANDO', label: 'Aguardando' },
  { valor: 'OK', label: 'OK' },
];

const situacoesValidas = new Set<string>(situacoesFiltro.map((s) => s.valor));

/** Interruptores da lista: o nome na URL é o mesmo parâmetro do backend. */
export const chavesBooleanas = ['comParado', 'agenteDesatualizado', 'piloto', 'inativos', 'semVersaoBanco'] as const;
type ChaveBooleana = (typeof chavesBooleanas)[number];

/** Parâmetros que não são filtro e sobrevivem ao "Limpar filtros". */
const naoFiltros = new Set(['foco']);

/** URL → filtro do backend. ?piloto=1 vira piloto=true; ausente não filtra. */
export function filtroDaUrl(params: URLSearchParams): FiltroClientes {
  const f: FiltroClientes = {
    busca: params.get('busca')?.trim() || undefined,
    situacao: params.getAll('situacao').filter((s): s is SituacaoMonitor => situacoesValidas.has(s)),
    versaoBanco: params.getAll('versaoBanco').filter(Boolean),
  };
  for (const chave of chavesBooleanas) {
    if (params.get(chave) === '1') f[chave] = true;
  }
  return f;
}

export function temFiltro(params: URLSearchParams) {
  return [...params.keys()].some((k) => !naoFiltros.has(k));
}

export function semFiltros(params: URLSearchParams) {
  const novo = new URLSearchParams();
  for (const k of naoFiltros) {
    const v = params.get(k);
    if (v) novo.set(k, v);
  }
  return novo;
}

export function comBooleano(params: URLSearchParams, chave: ChaveBooleana, ligado: boolean) {
  const novo = new URLSearchParams(params);
  if (ligado) novo.set(chave, '1');
  else novo.delete(chave);
  return novo;
}

export function comLista(params: URLSearchParams, chave: 'situacao' | 'versaoBanco', valores: string[]) {
  const novo = new URLSearchParams(params);
  novo.delete(chave);
  valores.forEach((v) => novo.append(chave, v));
  return novo;
}

export function comBusca(params: URLSearchParams, busca: string) {
  const novo = new URLSearchParams(params);
  if (busca.trim()) novo.set('busca', busca);
  else novo.delete('busca');
  return novo;
}
