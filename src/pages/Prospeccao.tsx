import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, MapPin, MapPinned, Search, SearchX, SlidersHorizontal } from 'lucide-react';
import { prospeccaoApi, type FiltroBusca } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { AcoesProspect } from '../components/AcoesProspect';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CategoriasPopover, CategoriasSheet } from '../components/CategoriasProspeccao';
import { CidadeCombobox } from '../components/CidadeCombobox';
import { ErrorAlert } from '../components/ErrorAlert';
import { GradeLugares, LugarCard, LugarCardSkeleton } from '../components/LugarCard';
import { MeusProspects } from '../components/MeusProspects';
import { Paginacao } from '../components/Paginacao';
import { categoriasProspeccao } from '../labels';
import { municipioOficial, normalizar, UF_PADRAO } from '../municipios';
import type { CategoriaProspeccao, LugarEncontrado, PaginaBuscaProspect } from '../types/api';

const CHAVE_ULTIMA_BUSCA = 'prospeccao.ultimaBusca';
const POR_PAGINA = 12;

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

/** Páginas diferentes podem repetir um lugar (achado por outra categoria): fica a primeira ocorrência. */
function lugaresSemRepetir(paginas: PaginaBuscaProspect[]) {
  const vistos = new Set<string>();
  const todos: LugarEncontrado[] = [];
  for (const pagina of paginas) {
    for (const lugar of pagina.lugares) {
      if (!vistos.has(lugar.placeId)) {
        vistos.add(lugar.placeId);
        todos.push(lugar);
      }
    }
  }
  return todos;
}

/** Filtro por nome sem acento e sem caixa: "acougue" acha "Açougue Boi Gordo". */
function filtrarPorNome(lugares: LugarEncontrado[], filtroNome: string) {
  const termo = normalizar(filtroNome);
  if (!termo) return lugares;
  return lugares.filter((l) => normalizar(l.nome ?? '').includes(termo));
}

type Aba = 'busca' | 'meus';

export default function Prospeccao() {
  // Na URL: voltar do levantamento (LTO) ou recarregar mantém a aba e a página
  const [params, setParams] = useSearchParams();
  const aba: Aba = params.get('aba') === 'meus' ? 'meus' : 'busca';
  const paginaUrl = Math.max(1, Number.parseInt(params.get('pagina') ?? '1', 10) || 1);
  const trocarAba = (nova: Aba) => setParams(nova === 'meus' ? { aba: 'meus' } : {}, { replace: true });
  const irParaPagina = (pagina: number, opcoes: { rolar?: boolean; replace?: boolean } = {}) => {
    setParams(
      (atual) => {
        const novos = new URLSearchParams(atual);
        if (pagina <= 1) novos.delete('pagina');
        else novos.set('pagina', String(pagina));
        return novos;
      },
      { replace: opcoes.replace ?? false }
    );
    if (opcoes.rolar) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      listaRef.current?.scrollIntoView({ block: 'start', behavior: suave ? 'smooth' : 'auto' });
    }
  };

  const [inicial] = useState(lerUltimaBusca);
  const [cidade, setCidade] = useState(inicial.cidade);
  const [categorias, setCategorias] = useState<CategoriaProspeccao[]>(inicial.categorias);
  const [erroCidade, setErroCidade] = useState<string | null>(null);
  const [erroCategorias, setErroCategorias] = useState<string | null>(null);
  // Categorias: painel de baixo no celular, popover no desktop
  const [painelCategorias, setPainelCategorias] = useState(false);
  const [popoverCategorias, setPopoverCategorias] = useState(false);
  const botaoCategorias = useRef<HTMLButtonElement>(null);
  const ancoraCategorias = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLElement>(null);
  const [filtro, setFiltro] = useState<FiltroBusca | null>(null);
  // Depois da busca o formulário vira uma linha de resumo; "editar" abre de novo
  const [editando, setEditando] = useState(false);
  const [filtroNome, setFiltroNome] = useState('');
  const [buscandoMais, setBuscandoMais] = useState(false);

  const busca = useInfiniteQuery({
    queryKey: ['prospeccao', 'busca', filtro],
    queryFn: ({ pageParam }) => prospeccaoApi.buscar(filtro as FiltroBusca, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (ultima) => ultima.proximaPagina,
    enabled: filtro !== null,
    // A mesma busca no mesmo dia já está em cache no backend; aqui evita refazer ao voltar para a tela
    staleTime: 5 * 60_000,
  });

  const lugares = useMemo(() => lugaresSemRepetir(busca.data?.pages ?? []), [busca.data]);
  // Filtro por nome antes de paginar
  const visiveis = useMemo(() => filtrarPorNome(lugares, filtroNome), [lugares, filtroNome]);
  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const pagina = Math.min(paginaUrl, totalPaginas);
  const inicio = (pagina - 1) * POR_PAGINA;
  const daPagina = visiveis.slice(inicio, inicio + POR_PAGINA);

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const oficial = municipioOficial(cidade);
    setErroCidade(cidade.trim() === '' ? 'Escolha a cidade.' : oficial ? null : 'Escolha uma cidade de SP da lista.');
    setErroCategorias(categorias.length === 0 ? 'Escolha pelo menos uma categoria.' : null);
    if (!oficial || categorias.length === 0) return;

    setCidade(oficial);
    setFiltroNome('');
    setPopoverCategorias(false);
    // Ordem fixa: a mesma seleção vira a mesma chave de cache
    const ordenadas = categoriasProspeccao.filter((c) => categorias.includes(c));
    salvarUltimaBusca({ cidade: oficial, categorias: ordenadas });
    setFiltro({ cidade: oficial, uf: UF_PADRAO, categorias: ordenadas });
    setEditando(false);
    irParaPagina(1, { replace: true });
  };

  const cancelarEdicao = () => {
    if (!filtro) return;
    setCidade(filtro.cidade);
    setCategorias(filtro.categorias);
    setErroCidade(null);
    setErroCategorias(null);
    setPopoverCategorias(false);
    setEditando(false);
  };

  const alterarCategorias = (c: CategoriaProspeccao[]) => {
    setCategorias(c);
    setErroCategorias(null);
  };

  const abrirCategorias = () => {
    if (window.matchMedia('(min-width: 768px)').matches) setPopoverCategorias((aberto) => !aberto);
    else setPainelCategorias(true);
  };

  const fecharCategorias = (devolverFoco = true) => {
    setPainelCategorias(false);
    setPopoverCategorias(false);
    if (devolverFoco) botaoCategorias.current?.focus();
  };

  /** Mais uma página do Google (gasta cota); se trouxe lugares novos, vai para a primeira página com eles. */
  const buscarMais = async () => {
    setBuscandoMais(true);
    try {
      const r = await busca.fetchNextPage();
      const novos = filtrarPorNome(lugaresSemRepetir(r.data?.pages ?? []), filtroNome).length;
      if (novos > pagina * POR_PAGINA) irParaPagina(pagina + 1, { rolar: true });
    } finally {
      setBuscandoMais(false);
    }
  };

  const buscando = busca.isFetching && !busca.isFetchingNextPage;
  const erroPrimeiraPagina = busca.isError && !busca.isFetchNextPageError;
  const mostrarFormulario = !filtro || editando;
  const todas = categorias.length === categoriasProspeccao.length;

  return (
    <div className="max-w-7xl">
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
              <form onSubmit={buscar} noValidate className="space-y-3" aria-label="Buscar prospects">
                {/* Celular: [cidade][Buscar] e Categorias na linha de baixo; desktop: tudo numa linha */}
                <div className="flex flex-wrap md:flex-nowrap items-start gap-2">
                  <div className="order-1 flex-1 min-w-0">
                    <CidadeCombobox
                      valor={cidade}
                      onChange={(v) => {
                        setCidade(v);
                        setErroCidade(null);
                      }}
                      error={erroCidade ?? undefined}
                      rotuloOculto
                    />
                  </div>
                  <div ref={ancoraCategorias} className="relative order-3 md:order-2 w-full md:w-auto">
                    <button
                      ref={botaoCategorias}
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={painelCategorias || popoverCategorias}
                      onClick={abrirCategorias}
                      className="w-full md:w-auto flex items-center gap-2 min-h-11 px-4 rounded-lg border border-neutral-300 bg-white text-sm font-semibold text-neutral-700 hover:border-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-2 whitespace-nowrap"
                    >
                      <SlidersHorizontal size={16} aria-hidden="true" />
                      Categorias
                      <span className="text-neutral-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="tabular-nums text-vr-700">{todas ? 'todas' : categorias.length}</span>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={`hidden md:block ml-auto text-neutral-400 transition-transform ${
                          popoverCategorias ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {popoverCategorias && (
                      <CategoriasPopover
                        selecionadas={categorias}
                        onChange={alterarCategorias}
                        onClose={fecharCategorias}
                        ancora={ancoraCategorias}
                      />
                    )}
                  </div>
                  <Button type="submit" loading={buscando} className="order-2 md:order-3 md:h-11">
                    {!buscando && <Search size={16} aria-hidden="true" />}
                    Buscar
                  </Button>
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
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white pl-4 pr-1 shadow-card md:max-w-xl">
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
            <CategoriasSheet selecionadas={categorias} onChange={alterarCategorias} onClose={() => fecharCategorias()} />
          )}

          {!filtro && (
            <div className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center">
              <MapPinned size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
              <p className="text-neutral-600 mt-3">Escolha a cidade e as categorias e toque em Buscar.</p>
              <p className="text-sm text-neutral-500 mt-1">Repetir a mesma busca no mesmo dia não consulta o Google de novo.</p>
            </div>
          )}

          {filtro && busca.isPending && (
            <GradeLugares aria-busy="true" aria-label="Buscando no Google">
              {Array.from({ length: 8 }, (_, i) => (
                <LugarCardSkeleton key={i} />
              ))}
            </GradeLugares>
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
            <section ref={listaRef} aria-label="Resultados da busca" className="scroll-mt-20 md:scroll-mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <p className="text-sm text-neutral-600" aria-live="polite">
                  {visiveis.length === 0 ? (
                    <>Nenhum lugar com “{filtroNome.trim()}” no nome</>
                  ) : (
                    <>
                      Mostrando{' '}
                      <span className="font-semibold text-neutral-900 tabular-nums">
                        {inicio + 1}–{inicio + daPagina.length}
                      </span>{' '}
                      de <span className="font-semibold text-neutral-900 tabular-nums">{visiveis.length}</span>{' '}
                      {visiveis.length === 1 ? 'lugar' : 'lugares'}
                      {filtroNome.trim() && <> com “{filtroNome.trim()}”</>} em {filtro.cidade}
                    </>
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
                    onChange={(e) => {
                      setFiltroNome(e.target.value);
                      if (pagina !== 1) irParaPagina(1, { replace: true });
                    }}
                    placeholder="Filtrar por nome"
                    aria-label="Filtrar resultados por nome"
                    className="w-full min-h-11 md:min-h-9 pl-9 pr-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-vr-500"
                  />
                </div>
              </div>

              {daPagina.length > 0 && (
                <GradeLugares>
                  {daPagina.map((lugar) => (
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
                </GradeLugares>
              )}

              <div className="mt-6 space-y-4">
                <Paginacao
                  pagina={pagina}
                  totalPaginas={totalPaginas}
                  onChange={(p) => irParaPagina(p, { rolar: true })}
                />

                {busca.isFetchNextPageError && (
                  <ErrorAlert>{mensagemErro(busca.error, 'Erro ao buscar mais resultados')}</ErrorAlert>
                )}

                {busca.hasNextPage && pagina === totalPaginas && (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <Button
                      variant="secondary"
                      onClick={buscarMais}
                      disabled={buscandoMais}
                      className="w-full sm:w-auto"
                    >
                      <Search size={16} aria-hidden="true" />
                      {buscandoMais ? 'Buscando no Google...' : 'Buscar mais resultados no Google'}
                    </Button>
                    <p className="text-xs text-neutral-500">Consulta o Google de novo e usa a cota de buscas do dia.</p>
                  </div>
                )}

                <p className="text-xs text-neutral-500 text-center">Dados e fotos: Google Maps</p>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
