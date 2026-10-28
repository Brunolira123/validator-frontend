import { useMemo, useState, type FormEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, MapPinned, Search, SearchX } from 'lucide-react';
import { prospeccaoApi, type FiltroBusca } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { Button } from '../components/Button';
import { AcoesProspect } from '../components/AcoesProspect';
import { Card } from '../components/Card';
import { ErrorAlert } from '../components/ErrorAlert';
import { Input } from '../components/Input';
import { LugarCard } from '../components/LugarCard';
import { MeusProspects } from '../components/MeusProspects';
import { categoriaProspeccaoLabel, categoriasProspeccao, ufs } from '../labels';
import type { CategoriaProspeccao, LugarEncontrado } from '../types/api';

const CHAVE_ULTIMA_BUSCA = 'prospeccao.ultimaBusca';
const TAMANHO_MAXIMO_CIDADE = 80;

/** Última cidade/UF/categorias do comercial, para não redigitar na rua. Storage pode estar bloqueado. */
function lerUltimaBusca(): FiltroBusca {
  const padrao: FiltroBusca = { cidade: '', uf: 'SP', categorias: [...categoriasProspeccao] };
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ULTIMA_BUSCA) ?? 'null') as Partial<FiltroBusca> | null;
    if (!salvo) return padrao;
    const categorias = (salvo.categorias ?? []).filter((c): c is CategoriaProspeccao =>
      categoriasProspeccao.includes(c as CategoriaProspeccao)
    );
    return {
      cidade: typeof salvo.cidade === 'string' ? salvo.cidade : padrao.cidade,
      uf: ufs.includes(salvo.uf as (typeof ufs)[number]) ? (salvo.uf as string) : padrao.uf,
      categorias: categorias.length > 0 ? categorias : padrao.categorias,
    };
  } catch {
    return padrao;
  }
}

function salvarUltimaBusca(filtro: FiltroBusca) {
  try {
    localStorage.setItem(CHAVE_ULTIMA_BUSCA, JSON.stringify(filtro));
  } catch {
    // Sem storage (aba anônima, bloqueio): só não lembra a busca
  }
}

/** Busca sem acento e sem caixa: "acougue" acha "Açougue Boi Gordo". */
function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

type Aba = 'busca' | 'meus';

export default function Prospeccao() {
  // Na URL: voltar do levantamento (LTO) ou recarregar mantém a aba
  const [params, setParams] = useSearchParams();
  const aba: Aba = params.get('aba') === 'meus' ? 'meus' : 'busca';
  const trocarAba = (nova: Aba) => setParams(nova === 'meus' ? { aba: 'meus' } : {}, { replace: true });
  const [inicial] = useState(lerUltimaBusca);
  const [cidade, setCidade] = useState(inicial.cidade);
  const [uf, setUf] = useState(inicial.uf);
  const [categorias, setCategorias] = useState<CategoriaProspeccao[]>(inicial.categorias);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroBusca | null>(null);
  const [filtroNome, setFiltroNome] = useState('');

  const busca = useInfiniteQuery({
    queryKey: ['prospeccao', 'busca', filtro],
    queryFn: ({ pageParam }) => prospeccaoApi.buscar(filtro as FiltroBusca, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (ultima) => ultima.proximaPagina,
    enabled: filtro !== null,
    // A mesma busca no mesmo dia já está em cache no backend; aqui evita refazer ao voltar para a tela
    staleTime: 5 * 60_000,
  });

  // Páginas diferentes podem repetir um lugar (achado por outra categoria): fica a primeira ocorrência
  const lugares = useMemo(() => {
    const vistos = new Set<string>();
    const todos: LugarEncontrado[] = [];
    for (const pagina of busca.data?.pages ?? []) {
      for (const lugar of pagina.lugares) {
        if (!vistos.has(lugar.placeId)) {
          vistos.add(lugar.placeId);
          todos.push(lugar);
        }
      }
    }
    return todos;
  }, [busca.data]);

  const visiveis = useMemo(() => {
    const termo = normalizar(filtroNome.trim());
    if (!termo) return lugares;
    return lugares.filter((l) => normalizar(l.nome ?? '').includes(termo));
  }, [lugares, filtroNome]);

  const alternarCategoria = (c: CategoriaProspeccao) => {
    setCategorias((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));
  };

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const cidadeLimpa = cidade.trim();
    if (!cidadeLimpa) {
      setErroForm('Informe a cidade.');
      return;
    }
    if (categorias.length === 0) {
      setErroForm('Escolha pelo menos um tipo de comércio.');
      return;
    }
    setErroForm(null);
    setFiltroNome('');
    // Ordem fixa: a mesma seleção vira a mesma chave de cache
    const novo: FiltroBusca = {
      cidade: cidadeLimpa,
      uf,
      categorias: categoriasProspeccao.filter((c) => categorias.includes(c)),
    };
    salvarUltimaBusca(novo);
    setFiltro(novo);
  };

  const todasMarcadas = categorias.length === categoriasProspeccao.length;
  const buscando = busca.isFetching && !busca.isFetchingNextPage;
  const erroPrimeiraPagina = busca.isError && !busca.isFetchNextPageError;

  return (
    <div className="max-w-5xl">
      <Link
        to="/comercial/clientes"
        className="inline-flex items-center gap-2 min-h-11 md:min-h-0 text-sm text-neutral-500 hover:text-neutral-700 mb-4 md:mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para prospects
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-neutral-900">Buscar prospects</h1>
        <p className="text-sm text-neutral-500 mt-1">Comércios de alimentos no Google Maps, por cidade.</p>
      </div>

      <div
        role="group"
        aria-label="Mostrar"
        className="mb-5 grid grid-cols-2 sm:inline-grid p-1 rounded-xl bg-neutral-100 border border-neutral-200"
      >
        {(
          [
            ['busca', 'Busca'],
            ['meus', 'Meus prospects'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={aba === valor}
            onClick={() => trocarAba(valor)}
            className={`min-h-11 md:min-h-9 px-4 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
              aba === valor ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'meus' ? (
        <MeusProspects />
      ) : (
        <>
        <Card className="mb-6">
          <form onSubmit={buscar} noValidate className="space-y-4">
            <div className="grid grid-cols-[1fr_5.5rem] sm:grid-cols-[1fr_6rem_auto] gap-3 items-end">
              <Input
                label="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                maxLength={TAMANHO_MAXIMO_CIDADE}
                placeholder="Ex.: Limeira"
                autoComplete="address-level2"
                enterKeyHint="search"
              />
              <div>
                <label htmlFor="busca-uf" className="block text-sm font-medium text-neutral-700 mb-1">
                  UF
                </label>
                <select
                  id="busca-uf"
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-vr-500"
                >
                  {ufs.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" loading={buscando} className="col-span-2 sm:col-span-1 md:h-11">
                {!buscando && <Search size={16} aria-hidden="true" />}
                Buscar
              </Button>
            </div>

            <fieldset className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <legend className="text-sm font-medium text-neutral-700">Tipos de comércio</legend>
                <button
                  type="button"
                  onClick={() => setCategorias(todasMarcadas ? [] : [...categoriasProspeccao])}
                  className="text-sm font-medium text-vr-700 hover:underline underline-offset-2 min-h-11 md:min-h-0"
                >
                  {todasMarcadas ? 'Limpar' : 'Marcar todos'}
                </button>
              </div>
              {/* Celular: uma linha com rolagem lateral (os 11 chips empurrariam os resultados); a partir de sm, quebra */}
              <div className="-mx-4 px-4 pb-1 flex gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:thin] sm:mx-0 sm:px-0 sm:pb-0 sm:flex-wrap sm:overflow-visible">
                {categoriasProspeccao.map((c) => {
                  const marcada = categorias.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={marcada}
                      onClick={() => alternarCategoria(c)}
                      className={`shrink-0 inline-flex items-center gap-1.5 min-h-11 md:min-h-9 px-3 rounded-full border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-1 ${
                        marcada
                          ? 'bg-vr-50 border-vr-300 text-vr-800'
                          : 'bg-white border-neutral-300 text-neutral-600 hover:border-neutral-400'
                      }`}
                    >
                      {marcada && <Check size={14} aria-hidden="true" />}
                      {categoriaProspeccaoLabel[c]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {erroForm && <ErrorAlert>{erroForm}</ErrorAlert>}
          </form>
        </Card>

        {!filtro && (
          <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center">
            <MapPinned size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
            <p className="text-neutral-600 mt-3">Escolha a cidade e os tipos de comércio e toque em Buscar.</p>
            <p className="text-sm text-neutral-500 mt-1">Repetir a mesma busca no mesmo dia não consulta o Google de novo.</p>
          </div>
        )}

        {filtro && busca.isPending && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4" aria-busy="true" aria-label="Buscando no Google">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="aspect-[5/2] sm:aspect-auto sm:w-36 bg-neutral-100 animate-pulse" />
                <div className="flex-1 p-4 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-neutral-100 animate-pulse" />
                  <div className="h-3 w-full rounded bg-neutral-100 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-neutral-100 animate-pulse" />
                  <div className="h-9 w-24 rounded-lg bg-neutral-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {erroPrimeiraPagina && <ErrorAlert>{mensagemErro(busca.error, 'Erro ao buscar prospects')}</ErrorAlert>}

        {filtro && busca.isSuccess && lugares.length === 0 && (
          <Card>
            <div className="text-center py-8">
              <SearchX size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
              <p className="text-neutral-600 mt-3">
                Nada encontrado em {filtro.cidade} - {filtro.uf} para os tipos escolhidos.
              </p>
              <p className="text-sm text-neutral-500 mt-1">Confira o nome da cidade ou marque mais tipos de comércio.</p>
            </div>
          </Card>
        )}

        {lugares.length > 0 && filtro && (
          <section aria-label="Resultados da busca">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-sm text-neutral-600" aria-live="polite">
                <span className="font-semibold text-neutral-900 tabular-nums">{lugares.length}</span>{' '}
                {lugares.length === 1 ? 'lugar' : 'lugares'} em {filtro.cidade} - {filtro.uf}
                {filtroNome.trim() && visiveis.length !== lugares.length && (
                  <span className="text-neutral-500"> · {visiveis.length} com esse nome</span>
                )}
              </p>
              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                  placeholder="Filtrar por nome"
                  aria-label="Filtrar resultados por nome"
                  className="w-full min-h-11 md:min-h-9 pl-9 pr-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-vr-500"
                />
              </div>
            </div>

            {visiveis.length === 0 ? (
              <p className="text-sm text-neutral-500 py-6 text-center">Nenhum lugar com “{filtroNome.trim()}” no nome.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {visiveis.map((lugar) => (
                  <LugarCard
                    key={lugar.placeId}
                    lugar={lugar}
                    acoes={
                      !lugar.deOutroComercial && (
                        <AcoesProspect
                          prospectId={lugar.prospectId}
                          status={lugar.statusProspect}
                          // A busca não traz o resultado da visita; temperatura só existe quando o cliente atendeu
                          atendeu={lugar.temperatura !== null}
                          nome={lugar.nome ?? 'Sem nome no Google'}
                          salvar={{
                            placeId: lugar.placeId,
                            cidade: filtro.cidade,
                            uf: filtro.uf,
                            categoria: lugar.categorias[0],
                          }}
                        />
                      )
                    }
                  />
                ))}
              </div>
            )}

            {busca.isFetchNextPageError && (
              <div className="mt-4">
                <ErrorAlert>{mensagemErro(busca.error, 'Erro ao carregar mais resultados')}</ErrorAlert>
              </div>
            )}

            {busca.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => busca.fetchNextPage()}
                  disabled={busca.isFetchingNextPage}
                  className="w-full sm:w-auto"
                >
                  {busca.isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
                </Button>
              </div>
            )}

            <p className="mt-6 text-xs text-neutral-500 text-center">Dados e fotos: Google Maps</p>
          </section>
        )}
        </>
      )}
    </div>
  );
}
