import { isAxiosError } from 'axios';
import type { ErroResponse } from '../types/api';

/**
 * Converte um erro de request em mensagem pro usuário.
 * Prioriza a mensagem do backend; senão, usa uma mensagem por status.
 */
export function mensagemErro(e: unknown, fallback = 'Erro inesperado'): string {
  if (!isAxiosError<ErroResponse>(e)) return fallback;

  const msgBackend = e.response?.data?.mensagem;
  if (msgBackend) return msgBackend;

  if (!e.response) {
    return navigator.onLine
      ? 'Não foi possível conectar ao servidor. Tente novamente.'
      : 'Sem conexão com a internet. Verifique o sinal e tente novamente.';
  }

  switch (e.response.status) {
    case 401:
      return 'Sessão expirada. Faça login novamente.';
    case 403:
      return 'Você não tem permissão para esta ação.';
    case 404:
      return 'Registro não encontrado.';
    case 409:
      return 'Conflito: o registro foi alterado ou já existe.';
    case 413:
      return 'Arquivo muito grande. Tente uma foto menor.';
    case 503:
      return 'Serviço temporariamente indisponível. Tente em alguns instantes.';
    default:
      return fallback;
  }
}

/** Erros 4xx não adiantam repetir — só retenta falha de rede/5xx. */
export function deveRetentar(failureCount: number, e: unknown): boolean {
  if (isAxiosError(e) && e.response && e.response.status < 500) return false;
  return failureCount < 1;
}
