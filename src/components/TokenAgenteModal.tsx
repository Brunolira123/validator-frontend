import { useState } from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { TokenAgenteResponse } from '../types/api';

interface Props {
  resultado: TokenAgenteResponse;
  onClose: () => void;
}

/** Mostra o token do agente uma única vez (o backend guarda só o hash), com o trecho pronto para o vr.properties. */
export function TokenAgenteModal({ resultado, onClose }: Props) {
  const [copiado, setCopiado] = useState(false);
  const trecho = `monitor.url=${window.location.origin}\nmonitor.token=${resultado.token}`;
  // Aberto pelo IP da rede local (http): esse endereço não existe na rede do cliente
  const enderecoLocal = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(trecho);
      setCopiado(true);
    } catch {
      // Sem permissão de clipboard (HTTP fora de localhost): o usuário seleciona e copia na mão
    }
  };

  return (
    <Modal title={`Token do agente: ${resultado.cliente.nome}`} onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
          <TriangleAlert size={18} className="shrink-0 mt-0.5" />
          <p>
            Copie agora: o token <strong>não aparece de novo</strong>. Se perder, gere outro (o anterior para de
            funcionar).
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-neutral-700 mb-1">
            Acrescente ao <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">vr.properties</code> do
            cliente:
          </p>
          <pre className="text-xs bg-neutral-900 text-neutral-100 rounded-lg p-3 overflow-x-auto select-all whitespace-pre-wrap break-all">
            {trecho}
          </pre>
        </div>

        {enderecoLocal && (
          <p className="text-sm text-red-600">
            Você abriu o portal pelo endereço da rede local. No <code className="text-xs">monitor.url</code>, use o endereço
            público (https://...ts.net), que é o que o cliente alcança.
          </p>
        )}

        <p className="text-sm text-neutral-500">
          Depois, na máquina do cliente: <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">docker compose up -d</code>{' '}
          (ou <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">restart</code>, se já estava rodando).
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={copiar}>
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
