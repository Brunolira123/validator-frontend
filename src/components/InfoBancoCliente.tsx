import { Database } from 'lucide-react';
import type { ClienteMonitoradoResponse } from '../types/api';

function Automatico({ label, ativo }: { label: string; ativo: boolean | null }) {
  if (ativo === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
        ativo ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-600'
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${ativo ? 'bg-green-500' : 'bg-neutral-400'}`} />
      {label}: {ativo ? 'ativo' : 'inativo'}
    </span>
  );
}

/** Versão do banco VR (uma só para todas as lojas) e encerramento/consistência automáticos, da última execução. */
export function InfoBancoCliente({ cliente }: { cliente: ClienteMonitoradoResponse }) {
  const { versaoBanco, encerramentoAutomatico, consistenciaAutomatica } = cliente;
  if (versaoBanco === null && encerramentoAutomatico === null && consistenciaAutomatica === null) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {versaoBanco && (
        <span className="inline-flex items-center gap-1.5 text-sm text-neutral-600">
          <Database size={14} className="text-neutral-400 shrink-0" />
          Banco {versaoBanco}
        </span>
      )}
      <Automatico label="Encerramento automático" ativo={encerramentoAutomatico} />
      <Automatico label="Consistência automática" ativo={consistenciaAutomatica} />
    </div>
  );
}
