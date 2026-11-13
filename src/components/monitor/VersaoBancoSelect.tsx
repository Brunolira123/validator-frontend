import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Database } from 'lucide-react';
import { monitorApi } from '../../api/monitor';

interface Props {
  selecionadas: string[];
  semVersao: boolean;
  onChange: (versoes: string[], semVersao: boolean) => void;
}

const opcao =
  'flex items-center gap-3 w-full min-h-11 md:min-h-9 px-3 text-sm text-left text-neutral-800 hover:bg-neutral-50 cursor-pointer';

/** Multisseleção das versões do banco VR em uso (com quantos clientes cada), mais "Sem versão". */
export function VersaoBancoSelect({ selecionadas, semVersao, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const painelId = useId();

  const { data: versoes, isLoading, error } = useQuery({
    queryKey: ['monitor', 'versoes-banco'],
    queryFn: monitorApi.versoesBanco,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const alternar = (v: string) =>
    onChange(selecionadas.includes(v) ? selecionadas.filter((x) => x !== v) : [...selecionadas, v], semVersao);

  const qtd = selecionadas.length + Number(semVersao);
  // Versão que veio pela URL e não está mais em uso continua visível para poder ser desmarcada
  const lista = [
    ...(versoes ?? []),
    ...selecionadas.filter((v) => !versoes?.some((x) => x.versao === v)).map((v) => ({ versao: v, clientes: 0 })),
  ];

  return (
    <div ref={raiz} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={painelId}
        onClick={() => setAberto((a) => !a)}
        className={`inline-flex items-center gap-2 min-h-11 md:min-h-10 px-3 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
          qtd > 0 ? 'bg-vr-600 border-vr-600 text-white' : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100'
        }`}
      >
        <Database size={16} aria-hidden="true" className="hidden sm:block" />
        Versão do BD{qtd > 0 && ` (${qtd})`}
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div
          id={painelId}
          role="group"
          aria-label="Versões do BD (VRMaster)"
          className="absolute right-0 z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-card-hover"
        >
          {isLoading && <p className="px-3 py-2 text-sm text-neutral-500">Carregando...</p>}
          {error && <p className="px-3 py-2 text-sm text-red-600">Erro ao carregar as versões</p>}
          {lista.map((v) => (
            <label key={v.versao} className={opcao}>
              <input
                type="checkbox"
                checked={selecionadas.includes(v.versao)}
                onChange={() => alternar(v.versao)}
                className="h-4 w-4 accent-vr-600"
              />
              <span className="flex-1 tabular-nums">{v.versao}</span>
              <span className="text-xs text-neutral-500 tabular-nums">
                {v.clientes} {v.clientes === 1 ? 'cliente' : 'clientes'}
              </span>
            </label>
          ))}
          {versoes && (
            <label className={`${opcao} border-t border-neutral-100`}>
              <input
                type="checkbox"
                checked={semVersao}
                onChange={() => onChange(selecionadas, !semVersao)}
                className="h-4 w-4 accent-vr-600"
              />
              <span className="flex-1">Sem versão</span>
            </label>
          )}
          {qtd > 0 && (
            <button
              type="button"
              onClick={() => onChange([], false)}
              className="w-full min-h-11 md:min-h-9 px-3 text-left text-sm font-semibold text-vr-700 hover:bg-vr-50 border-t border-neutral-100"
            >
              Limpar seleção
            </button>
          )}
        </div>
      )}
    </div>
  );
}
