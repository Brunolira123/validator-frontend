import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/** 75 → "1 min 15 s" */
function duracao(segundos: number) {
  if (segundos < 60) return `${segundos} s`;
  return `${Math.floor(segundos / 60)} min ${segundos % 60} s`;
}

/** "Aguardando o agente…" com o tempo desde o clique (relógio do navegador, não o do servidor). */
export function AguardandoAgente({ inicio }: { inicio: number }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1_000);
    return () => clearInterval(t);
  }, []);
  const decorrido = Math.max(0, Math.floor((agora - inicio) / 1_000));

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg bg-neutral-50 border border-neutral-200 px-4 py-6 text-sm text-neutral-600"
    >
      <Loader2 size={16} className="animate-spin shrink-0 text-vr-600" aria-hidden="true" />
      <span>
        Aguardando o agente… <span className="tabular-nums text-neutral-400">{duracao(decorrido)}</span>
      </span>
    </div>
  );
}
