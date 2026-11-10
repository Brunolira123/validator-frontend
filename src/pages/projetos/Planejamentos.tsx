import { useEffect, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarDays, FolderKanban, Plus, Search } from 'lucide-react';
import { planejamentosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorAlert } from '../../components/ErrorAlert';
import { Paginacao } from '../../components/Paginacao';
import { Avatares } from '../../components/projetos/Avatar';
import { SituacaoPlanejamentoBadge } from '../../components/projetos/SituacaoPlanejamentoBadge';
import { EscolherTemplateModal } from '../../components/projetos/EscolherTemplateModal';
import { NovoPlanejamentoModal } from '../../components/projetos/NovoPlanejamentoModal';
import { selectCls } from '../../components/projetos/atividades';
import { useAnalistas } from '../../components/projetos/useAnalistas';
import { useAuthStore } from '../../stores/authStore';
import { formatarDiaMes, tempoDesde } from '../../labels';
import { ehEditor, fmtHoras, situacaoLabel, situacoes, somar, instante } from '../../projetos';
import type { Planejamento, PlanejamentoResumo, SituacaoPlanejamento } from '../../types/projetos';

const TAMANHO = 12;

/** Quem trabalha no planejamento: o responsável e quem tem horas nas atividades. */
function pessoasDe(resumo: PlanejamentoResumo, detalhe?: Planejamento) {
  const mapa = new Map<number, string>();
  if (resumo.responsavelId && resumo.responsavelNome) mapa.set(resumo.responsavelId, resumo.responsavelNome);
  detalhe?.atividades.forEach((a) => {
    if (a.responsavelId && a.responsavelNome) mapa.set(a.responsavelId, a.responsavelNome);
    a.distribuicao.forEach((d) => mapa.set(d.usuarioId, d.usuarioNome));
  });
  return [...mapa].map(([id, nome]) => ({ id, nome }));
}

function PlanejamentoCard({
  p,
  detalhe,
  editor,
  onAbrir,
  onEscolherTemplate,
}: {
  p: PlanejamentoResumo;
  detalhe?: Planejamento;
  editor: boolean;
  onAbrir: () => void;
  onEscolherTemplate: () => void;
}) {
  const calc = detalhe?.calculo;
  const pessoas = pessoasDe(p, detalhe);
  const semTemplate = p.situacao === 'RASCUNHO' && !p.templateNome;
  const excedente =
    calc && calc.horasContratadas != null && calc.saldoContrato != null && calc.saldoContrato < 0 ? -calc.saldoContrato : 0;

  const linha2 = [
    p.levantamentoId ? `LTO #${p.levantamentoId}` : null,
    p.templateNome ? `Template: ${p.templateNome} v${p.templateVersao}` : null,
    p.kickoff ? `kickoff ${formatarDiaMes(p.kickoff)}` : null,
  ].filter(Boolean);

  return (
    <Card interativo onClick={onAbrir} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onAbrir()} className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <SituacaoPlanejamentoBadge situacao={p.situacao} doLto={!!p.levantamentoId} />
        {p.calculadoEm && p.calculoDesatualizado && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-800">
            <AlertTriangle size={12} aria-hidden="true" />
            Cálculo desatualizado
          </span>
        )}
      </div>
      <h2 className="mt-3 font-semibold text-neutral-900 break-words">{p.nome}</h2>
      <p className="text-sm text-neutral-500 break-words">{p.clienteNome}</p>
      {linha2.length > 0 && <p className="mt-2 text-sm text-neutral-500">{linha2.join(' · ')}</p>}

      {semTemplate ? (
        <>
          <p className="mt-2 text-sm text-neutral-700">Sem template aplicado</p>
          {editor && (
            <div className="mt-3">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEscolherTemplate();
                }}
              >
                Escolher template
              </Button>
            </div>
          )}
        </>
      ) : calc ? (
        <>
          <p className="mt-2 text-sm text-neutral-700">
            {fmtHoras(calc.horasServico)} serviço
            {calc.horasViagem > 0 && ` · ${fmtHoras(calc.horasViagem)} viagem`} · término {formatarDiaMes(calc.termino)} ·{' '}
            <strong className="font-semibold text-neutral-900">{calc.diasUteis} dias úteis</strong>
          </p>
          {calc.horasContratadas != null && (
            <p className="mt-1 text-sm text-neutral-600">
              {fmtHoras(calc.horasContratadas)} contratadas · {fmtHoras(calc.horasServico)} planejadas
              {excedente > 0 && (
                <span className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                  +{fmtHoras(excedente)}
                </span>
              )}
            </p>
          )}
        </>
      ) : p.terminoCalculado ? (
        <p className="mt-2 text-sm text-neutral-700">Término {formatarDiaMes(p.terminoCalculado)}</p>
      ) : (
        <p className="mt-2 text-sm text-neutral-500">Cronograma ainda não calculado</p>
      )}

      <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-neutral-400">
        <Avatares pessoas={pessoas} />
        <span>Atualizado {tempoDesde(instante(p.atualizadoEm))}</span>
      </div>
    </Card>
  );
}

export default function Planejamentos() {
  const navigate = useNavigate();
  const perfil = useAuthStore((s) => s.usuario?.perfil);
  const editor = ehEditor(perfil);
  const analistas = useAnalistas();

  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [situacao, setSituacao] = useState<SituacaoPlanejamento | ''>('');
  const [responsavelId, setResponsavelId] = useState<number | ''>('');
  const [pagina, setPagina] = useState(1);
  const [novoAberto, setNovoAberto] = useState(false);
  const [templatePara, setTemplatePara] = useState<PlanejamentoResumo | null>(null);

  // Busca no servidor depois de uma pausa na digitação
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaAplicada(busca.trim());
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  const filtro = {
    busca: buscaAplicada || undefined,
    situacao: situacao || undefined,
    responsavelId: responsavelId || undefined,
    pagina: pagina - 1,
    tamanho: TAMANHO,
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['projetos', 'planejamentos', filtro],
    queryFn: () => planejamentosApi.listar(filtro),
    placeholderData: (anterior) => anterior,
  });

  // O resumo não traz horas, dias úteis nem a equipe: cada card busca o detalhe (fica em cache para a tela do
  // planejamento). TODO: quando o resumo trouxer esses campos, tirar esta busca.
  const calculados = data?.planejamentos ?? [];
  const detalhes = useQueries({
    queries: calculados.map((p) => ({
      queryKey: ['projetos', 'planejamento', p.id],
      queryFn: () => planejamentosApi.buscar(p.id),
      staleTime: 60_000,
    })),
  });
  const detalheDe = (id: number) => detalhes[calculados.findIndex((p) => p.id === id)]?.data;

  const filtrosAtivos = !!(buscaAplicada || situacao || responsavelId);
  const itens = data?.planejamentos ?? [];
  const totalHoras = somar(itens.map((p) => detalheDe(p.id)?.calculo?.horasServico ?? 0));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-neutral-900">Planejamentos de implantação</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {editor
              ? 'Todo LTO concluído chega aqui como rascunho. Planeje, gere o cronograma e envie ao cliente.'
              : 'Planejamentos dos clientes que você fechou (somente leitura).'}
          </p>
        </div>
        {editor && (
          <Button onClick={() => setNovoAberto(true)} className="w-full sm:w-auto">
            <Plus size={16} aria-hidden="true" />
            Planejamento avulso
          </Button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2">
        <div className="relative sm:col-span-2 lg:w-80">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            aria-label="Buscar cliente ou planejamento"
            placeholder="Buscar cliente ou planejamento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full min-h-11 pl-9 pr-3 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-vr-500"
          />
        </div>
        <select
          aria-label="Situação"
          className={`${selectCls} lg:w-56`}
          value={situacao}
          onChange={(e) => {
            setSituacao(e.target.value as SituacaoPlanejamento | '');
            setPagina(1);
          }}
        >
          <option value="">Situação: todas</option>
          {situacoes.map((s) => (
            <option key={s} value={s}>
              {situacaoLabel[s]}
            </option>
          ))}
        </select>
        <select
          aria-label="Responsável"
          className={`${selectCls} lg:w-56`}
          value={responsavelId}
          onChange={(e) => {
            setResponsavelId(e.target.value ? Number(e.target.value) : '');
            setPagina(1);
          }}
        >
          <option value="">Responsável: todos</option>
          {analistas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorAlert>{mensagemErro(error, 'Não foi possível carregar os planejamentos.')}</ErrorAlert>}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      )}

      {data && itens.length === 0 && (
        <Card className="text-center py-12">
          <FolderKanban size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
          <p className="mt-3 font-medium text-neutral-800">
            {filtrosAtivos ? 'Nenhum planejamento com esses filtros' : 'Nenhum planejamento ainda'}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {filtrosAtivos
              ? 'Mude a busca ou os filtros.'
              : editor
                ? 'Quando o comercial concluir um LTO, o rascunho aparece aqui.'
                : 'Os planejamentos dos clientes que você fechou aparecem aqui.'}
          </p>
        </Card>
      )}

      {itens.length > 0 && (
        <>
          <p className="mb-3 text-xs text-neutral-500 flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" />
            {data!.totalItens} planejamento(s)
            {totalHoras > 0 && <> · {fmtHoras(totalHoras)} de serviço nesta página</>}
            {isFetching && <span className="text-neutral-400"> · atualizando…</span>}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {itens.map((p) => (
              <PlanejamentoCard
                key={p.id}
                p={p}
                detalhe={detalheDe(p.id)}
                editor={editor}
                onAbrir={() => navigate(`/projetos/planejamentos/${p.id}`)}
                onEscolherTemplate={() => setTemplatePara(p)}
              />
            ))}
          </div>
          <div className="mt-6">
            <Paginacao pagina={pagina} totalPaginas={data!.totalPaginas} onChange={setPagina} disabled={isFetching} />
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-neutral-400">
        Situações: Rascunho → Em planejamento → Enviado ao cliente → Criado no Artia (marcado manualmente nesta fase).
      </p>

      {novoAberto && (
        <NovoPlanejamentoModal
          onClose={() => setNovoAberto(false)}
          onCriado={(p) => navigate(`/projetos/planejamentos/${p.id}`)}
        />
      )}
      {templatePara && (
        <EscolherTemplateModal
          planejamentoId={templatePara.id}
          nomePlanejamento={templatePara.nome}
          temAtividades={(detalheDe(templatePara.id)?.atividades.length ?? 0) > 0}
          onClose={() => setTemplatePara(null)}
          onAplicado={(p) => navigate(`/projetos/planejamentos/${p.id}?aba=atividades`)}
        />
      )}
    </div>
  );
}
