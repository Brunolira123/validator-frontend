import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, MapPinned, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { prospeccaoApi, type FiltroBusca } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { AcoesProspect } from '../components/AcoesProspect';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CategoriasCheckboxes, CategoriasSheet } from '../components/CategoriasProspeccao';
import { CidadeCombobox } from '../components/CidadeCombobox';
import { ErrorAlert } from '../components/ErrorAlert';
import { LugarCard } from '../components/LugarCard';
import { MeusProspects } from '../components/MeusProspects';
import { categoriasProspeccao } from '../labels';
import { municipioOficial, normalizar, UF_PADRAO } from '../municipios';
import type { CategoriaProspeccao, LugarEncontrado } from '../types/api';

const CHAVE_ULTIMA_BUSCA = 'prospeccao.ultimaBusca';

interface UltimaBusca {
  cidade: string;
  categorias: CategoriaProspeccao[];
}

/**
 * Última cidade e categorias do comercial, para não redigitar na rua. Storage pode estar bloqueado.
 * Formato antigo ({ cidade, uf, categorias } com cidade livre): a cidade só volta se for de SP e da lista do IBGE.
 */
function lerUltimaBusca(): UltimaBusca {
  const padrao: UltimaBusca = { cidade: '', categorias: [...categoriasProspeccao] };
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ULTIMA_BUSCA) ?? 'null') as
      | (Partial<UltimaBusca> & { uf?: unknown })
      | null;
    if (!salvo || typeof salvo !== 'object') return padrao;
    const categorias = (Array.isArray(salvo.categorias) ? salvo.categorias : []).filter(
      (c): c is CategoriaProspeccao => categoriasProspeccao.includes(c as CategoriaProspeccao)
    );
    const ufCompativel = salvo.uf === undefined || salvo.uf === UF_PADRAO;
    const cidade = ufCompativel && typeof salvo.cidade === 'string' ? municipioOficial(salvo.cidade) : null;
    return {
      cidade: cidade ?? padrao.cidade,
      categorias: categorias.length > 0 ? categorias : padrao.categorias,
    };
  } catch {
    return padrao;
  }
}

function salvarUltimaBusca(busca: UltimaBusca) {
  try {
    localStorage.setItem(CHAVE_ULTIMA_BUSCA, JSON.stringify(busca));
  } catch {
    // Sem storage (aba anônima, bloqueio): só não lembra a busca
  }
}

function rotuloCategorias(n: number) {
  return `${n} ${n === 1 ? 'categoria' : 'categorias'}`;
}

type Aba = 'busca' | 'meus';

export default function Prospeccao() {
  // Na URL: voltar do levantamento (LTO) ou recarregar mantém a aba
  const [params, setParams] = useSearchParams();
  const aba: Aba = params.get('aba') === 'meus' ? 'meus' : 'busca';
  const trocarAba = (nova: Aba) => setParams(nova === 'meus' ? { aba: 'meus' } : {}, { replace: true });
  const [inicial] = useState(lerUltimaBusca);
  const [cidade, setCidade] = useState(inicial.cidade);
  const [categorias, setCategorias] = useState<CategoriaProspeccao[]>(inicial.categorias);
  const [erroCidade, setErroCidade] = useState<string | null>(null);
  const [erroCategorias, setErroCategorias] = useState<string | null>(null);
  const [painelCategorias, setPainelCategorias] = useState(false);
  const botaoCategorias = useRef<HTMLButtonElement>(null);
  const [filtro, setFiltro] = useState<FiltroBusca | null>(null);
  // Depois da busca o formulário vira uma linha de resumo; "editar" abre de novo
  const [editando, setEditando] = useState(false);
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
    const termo = normalizar(filtroNome);
    if (!termo) return lugares;
    return lugares.filter((l) => normalizar(l.nome ?? '').includes(termo));
  }, [lugares, filtroNome]);

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const oficial = municipioOficial(cidade);
    setErroCidade(cidade.trim() === '' ? 'Escolha a cidade.' : oficial ? null : 'Escolha uma cidade de SP da lista.');
    setErroCategorias(categorias.length === 0 ? 'Escolha pelo menos uma categoria.' : null);
    if (!oficial || categorias.length === 0) return;

    setCidade(oficial);
    setFiltroNome('');
    // Ordem fixa: a mesma seleção vira a mesma chave de cache
    const ordenadas = categoriasProspeccao.filter((c) => categorias.includes(c));
    salvarUltimaBusca({ cidade: oficial, categorias: ordenadas });
    setFiltro({ cidade: oficial, uf: UF_PADRAO, categorias: ordenadas });
    setEditando(false);
  };

  const cancelarEdicao = () => {
    if (!filtro) return;
    setCidade(filtro.cidade);
    setCategorias(filtro.categorias);
    setErroCidade(null);
    setErroCategorias(null);
    setEditando(false);
  };

  const fecharPainel = () => {
    setPainelCategorias(false);
    botaoCategorias.current?.focus();
  };

  const buscando = busca.isFetching && !busca.isFetchingNextPage;
  const erroPrimeiraPagina = busca.isError && !busca.isFetchNextPageError;
  const mostrarFormulario = !filtro || editando;

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
        <p className="text-sm text-neutral-500 mt-1">Comércios de alimentos em SP no Google Maps, por cidade.</p>
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
          {mostrarFormulario ? (
            <Card className="mb-6">
              <form onSubmit={buscar} noValidate className="space-y-3 md:space-y-4" aria-label="Buscar prospects">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-start">
                  <CidadeCombobox
                    valor={cidade}
                    onChange={(v) => {
                      setCidade(v);
                      setErroCidade(null);
                    }}
                    error={erroCidade ?? undefined}
                    rotuloOculto
                  />
                  <Button type="submit" loading={buscando} className="md:h-11">
                    {!buscando && <Search size={16} aria-hidden="true" />}
                    Buscar
                  </Button>
                </div>

                {/* Celular: as 11 categorias ficam num painel; a partir de md, inline */}
                <button
                  ref={botaoCategorias}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setPainelCategorias(true)}
                  className="md:hidden w-full flex items-center gap-2 min-h-11 px-4 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-2"
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Categorias
                  <span className="text-neutral-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="tabular-nums text-vr-700">
                    {categorias.length === categoriasProspeccao.length ? 'todas' : categorias.length}
                  </span>
                </button>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-neutral-700">Categorias</p>
                  <CategoriasCheckboxes
                    selecionadas={categorias}
                    onChange={(c) => {
                      setCategorias(c);
                      setErroCategorias(null);
                    }}
                  />
                </div>

                {erroCategorias && <ErrorAlert>{erroCategorias}</ErrorAlert>}

                {filtro && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={cancelarEdicao}
                      className="min-h-11 md:min-h-8 px-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </form>
            </Card>
          ) : (
            filtro && (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white pl-4 pr-1 shadow-card">
                <MapPin size={16} className="shrink-0 text-vr-600" aria-hidden="true" />
                <p className="flex-1 min-w-0 py-2 text-sm text-neutral-700 truncate">
                  <span className="font-semibold text-neutral-900">{filtro.cidade}</span>
                  <span className="text-neutral-400"> · </span>
                  {filtro.categorias.length === categoriasProspeccao.length
                    ? 'todas as categorias'
                    : rotuloCategorias(filtro.categorias.length)}
                </p>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  aria-label={`Editar busca (${filtro.cidade}, ${rotuloCategorias(filtro.categorias.length)})`}
                  className="shrink-0 min-h-11 px-3 text-sm font-semibold text-vr-700 rounded-lg hover:bg-vr-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
                >
                  editar
                </button>
              </div>
            )
          )}

          {painelCategorias && (
            <CategoriasSheet
              selecionadas={categorias}
              onChange={(c) => {
                setCategorias(c);
                setErroCategorias(null);
              }}
              onClose={fecharPainel}
            />
          )}

          {!filtro && (
            <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center">
              <MapPinned size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
              <p className="text-neutral-600 mt-3">Escolha a cidade e as categorias e toque em Buscar.</p>
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
                <p className="text-neutral-600 mt-3">Nada encontrado em {filtro.cidade} para as categorias escolhidas.</p>
                <p className="text-sm text-neutral-500 mt-1">Marque mais categorias ou tente uma cidade vizinha.</p>
              </div>
            </Card>
          )}

          {lugares.length > 0 && filtro && (
            <section aria-label="Resultados da busca">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <p className="text-sm text-neutral-600" aria-live="polite">
                  <span className="font-semibold text-neutral-900 tabular-nums">{lugares.length}</span>{' '}
                  {lugares.length === 1 ? 'lugar' : 'lugares'} em {filtro.cidade}
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
