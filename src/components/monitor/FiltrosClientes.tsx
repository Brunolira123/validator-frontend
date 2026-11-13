import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { VersaoBancoSelect } from './VersaoBancoSelect';
import {
  comBooleano,
  comBusca,
  comLista,
  semFiltros,
  situacoesFiltro,
  temFiltro,
} from './filtrosUrl';

function Chip({
  ativo,
  onClick,
  title,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      title={title}
      className={`shrink-0 min-h-11 md:min-h-9 px-3 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
        ativo ? 'bg-vr-600 border-vr-600 text-white' : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  );
}

const interruptores = [
  { chave: 'comParado', label: 'Container parado' },
  { chave: 'agenteDesatualizado', label: 'Agente desatualizado', title: 'Abaixo da maior versão em uso nos clientes ativos' },
  { chave: 'piloto', label: 'Piloto' },
  { chave: 'inativos', label: 'Mostrar inativos' },
] as const;

/**
 * Filtros da lista única, guardados na URL (o link pode ser compartilhado). Todos somam (E); as versões do BD
 * marcadas valem como OU entre si.
 */
export function FiltrosClientes() {
  const [params, setParams] = useSearchParams();
  const buscaUrl = params.get('busca') ?? '';
  const [busca, setBusca] = useState(buscaUrl);
  const [buscaUrlAnterior, setBuscaUrlAnterior] = useState(buscaUrl);

  // Voltar/avançar do navegador ou "Limpar filtros" trocam a busca da URL: o campo acompanha
  if (buscaUrl !== buscaUrlAnterior) {
    setBuscaUrlAnterior(buscaUrl);
    setBusca(buscaUrl);
  }

  // Debounce: não consulta o backend a cada tecla
  useEffect(() => {
    if (busca === buscaUrl) return;
    const t = setTimeout(() => setParams((p) => comBusca(p, busca), { replace: true }), 300);
    return () => clearTimeout(t);
  }, [busca, buscaUrl, setParams]);

  const situacoes = params.getAll('situacao');
  const alternarSituacao = (s: string) =>
    setParams(
      (p) => comLista(p, 'situacao', situacoes.includes(s) ? situacoes.filter((x) => x !== s) : [...situacoes, s]),
      { replace: true },
    );

  return (
    <div className="mb-4 space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0 md:max-w-80">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente"
            aria-label="Buscar cliente pelo nome"
            className="w-full min-h-11 md:min-h-10 pl-9 pr-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vr-500"
          />
        </div>
        <VersaoBancoSelect
          selecionadas={params.getAll('versaoBanco')}
          semVersao={params.get('semVersaoBanco') === '1'}
          onChange={(versoes, semVersao) =>
            setParams((p) => comBooleano(comLista(p, 'versaoBanco', versoes), 'semVersaoBanco', semVersao), {
              replace: true,
            })
          }
        />
      </div>

      {/* Celular: os chips rolam na horizontal em vez de empilhar em várias linhas */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        <div role="group" aria-label="Situação" className="flex gap-2">
          {situacoesFiltro.map((s) => (
            <Chip key={s.valor} ativo={situacoes.includes(s.valor)} onClick={() => alternarSituacao(s.valor)}>
              {s.label}
            </Chip>
          ))}
        </div>
        <span aria-hidden="true" className="shrink-0 w-px bg-neutral-200 my-1" />
        {interruptores.map((i) => {
          const ativo = params.get(i.chave) === '1';
          return (
            <Chip
              key={i.chave}
              ativo={ativo}
              title={'title' in i ? i.title : undefined}
              onClick={() => setParams((p) => comBooleano(p, i.chave, !ativo), { replace: true })}
            >
              {i.label}
            </Chip>
          );
        })}
        {temFiltro(params) && (
          <button
            type="button"
            onClick={() => setParams((p) => semFiltros(p), { replace: true })}
            className="shrink-0 inline-flex items-center gap-1 min-h-11 md:min-h-9 px-2 rounded-lg text-sm font-semibold text-vr-700 hover:bg-vr-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
          >
            <X size={16} aria-hidden="true" />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
