import { formatarDiaMesInstante } from '../../labels';
import type { ClienteListaResponse, ExecucaoMonitor } from '../../types/api';

/** "Desativado em 12/11 por Fulano · motivo". */
export function textoDesativacao(c: ClienteListaResponse) {
  const d = c.desativacao;
  if (!d) return 'Desativado';
  return [`Desativado em ${formatarDiaMesInstante(d.em)}`, d.porNome && `por ${d.porNome}`].filter(Boolean).join(' ');
}

/** Resumo de uma execução: erro, lojas com falha ou tudo ok. */
export function resumoExecucao(e: ExecucaoMonitor) {
  if (e.erro) return `Erro: ${e.erro}`;
  if (e.lojasComFalha > 0) return `${e.lojasComFalha} de ${e.totalLojas} loja(s) com falha`;
  return `${e.totalLojas} loja(s) ok`;
}
