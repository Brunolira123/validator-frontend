import type { SuporteClienteResponse } from './types/api';

/** O que decide o badge de atualização. ultimaAtualizacao só vem na lista do Suporte. */
export type EstadoAtualizacao = Pick<SuporteClienteResponse, 'versaoAlvoAgente'> & {
  ultimaAtualizacao?: SuporteClienteResponse['ultimaAtualizacao'];
};

/** Primeira versão do agente que atende pedido de log (app.monitor.versao-minima-log). */
export const VERSAO_MINIMA_LOG = '2.3.0';
/** Primeira versão que atende START/RESTART (app.monitor.versao-minima-acao). */
export const VERSAO_MINIMA_ACAO = '2.4.0';

/** Mesmo formato que o backend aceita: 1.2.3 ou 1.2.3-rc.1. */
export const REGEX_VERSAO = /^\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?$/;

function partes(v: string) {
  const t = v.trim();
  const hifen = t.indexOf('-');
  const nucleo = hifen === -1 ? t : t.slice(0, hifen);
  const pre = hifen === -1 ? '' : t.slice(hifen + 1);
  const [a = 0, b = 0, c = 0] = nucleo.split('.').map((p) => parseInt(p, 10) || 0);
  return { numeros: [a, b, c], pre };
}

/** Negativo se a < b. "2.10.0" > "2.9.0" e "2.5.0-rc.1" < "2.5.0", como no semver. */
export function compararVersoes(a: string, b: string): number {
  const x = partes(a);
  const y = partes(b);
  for (let i = 0; i < 3; i++) {
    if (x.numeros[i] !== y.numeros[i]) return x.numeros[i] - y.numeros[i];
  }
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre.localeCompare(y.pre, undefined, { numeric: true });
}

/** Versão desconhecida conta como abaixo de qualquer mínimo. */
export const abaixoDe = (versao: string | null, minima: string) => !versao || compararVersoes(versao, minima) < 0;

/** Maior versão estável em uso: a referência do filtro "Desatualizados". Pré-release do piloto não conta. */
export function versaoMaisNova(clientes: SuporteClienteResponse[]): string | null {
  let maior: string | null = null;
  for (const c of clientes) {
    const v = c.versaoAgente?.trim();
    if (!v || !REGEX_VERSAO.test(v) || v.includes('-')) continue;
    if (!maior || compararVersoes(v, maior) > 0) maior = v;
  }
  return maior;
}

/**
 * FALHA: a última tentativa foi para a versão alvo atual e deu FALHOU/ROLLBACK (o updater não tenta de novo).
 * PENDENTE: há versão alvo e ela ainda não falhou.
 */
export function situacaoAtualizacao(c: EstadoAtualizacao): 'FALHA' | 'PENDENTE' | null {
  if (!c.versaoAlvoAgente) return null;
  const u = c.ultimaAtualizacao;
  if (u && u.status !== 'ATUALIZADO' && u.versaoAlvo === c.versaoAlvoAgente) return 'FALHA';
  return 'PENDENTE';
}
