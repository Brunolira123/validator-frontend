import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatarDiaMes } from '../labels';
import type { NfceNaoTransmitida } from '../types/api';

interface Props {
  nfce: NfceNaoTransmitida[];
  /** Dia da consistência que falhou (as NFC-e são desse dia). */
  dia: string | null;
}

/** NFC-e não transmitidas que seguram a consistência da loja: em contingência e/ou rejeitadas pela SEFAZ. */
export function NfceNaoTransmitidas({ nfce, dia }: Props) {
  const contingencia = nfce.filter((n) => n.contingencia).length;
  const rejeitadas = nfce.filter((n) => n.motivoRejeicao).length;
  // O resumo basta na maioria das vezes: a tabela só abre quando pedem
  const [aberto, setAberto] = useState(false);
  const tabelaId = useId();

  return (
    <div className="mt-4 pt-3 border-t border-neutral-100">
      <p className="text-sm font-medium text-neutral-900">
        {nfce.length} NFC-e não transmitida(s){dia && ` em ${formatarDiaMes(dia)}`}
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {contingencia} em contingência · {rejeitadas} rejeitada(s)
        </p>
        <button
          type="button"
          aria-expanded={aberto}
          aria-controls={tabelaId}
          onClick={() => setAberto((a) => !a)}
          className="inline-flex items-center gap-1 min-h-11 md:min-h-0 text-xs text-vr-700 font-medium hover:underline shrink-0"
        >
          {aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
          <ChevronDown size={14} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <div id={tabelaId} hidden={!aberto} className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-neutral-100">
        <table className="w-full text-xs">
          <thead className="bg-neutral-50 text-neutral-500 sticky top-0">
            <tr>
              <th scope="col" className="text-left font-medium px-2 py-1.5">Contingência</th>
              <th scope="col" className="text-left font-medium px-2 py-1.5">Rejeitada</th>
              <th scope="col" className="text-left font-medium px-2 py-1.5">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {nfce.map((n, i) => (
              <tr key={i}>
                <td className="px-2 py-1.5 text-neutral-900">{n.contingencia ? 'Sim' : 'Não'}</td>
                <td className={`px-2 py-1.5 ${n.motivoRejeicao ? 'text-red-600 font-medium' : 'text-neutral-900'}`}>
                  {n.motivoRejeicao ? 'Sim' : 'Não'}
                </td>
                <td className="px-2 py-1.5 text-neutral-600 break-words">{n.motivoRejeicao ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
