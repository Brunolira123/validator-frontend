import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, Plus } from 'lucide-react';
import { cadastrosApi, planejamentosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorAlert } from '../../components/ErrorAlert';
import { arvoreDe, horasTotais } from '../../components/projetos/atividades';
import { paraEditavelTemplate } from '../../components/projetos/templateAtividades';
import { fmtHoras, instante } from '../../projetos';
import { tempoDesde } from '../../labels';
import type { PlanejamentoResumo } from '../../types/projetos';

/** Todos os planejamentos (páginas de 50), só para contar o uso de cada template. */
async function todosPlanejamentos(): Promise<PlanejamentoResumo[]> {
  const todos: PlanejamentoResumo[] = [];
  for (let pagina = 0; pagina < 40; pagina++) {
    const r = await planejamentosApi.listar({ pagina, tamanho: 50 });
    todos.push(...r.planejamentos);
    if (pagina >= r.totalPaginas - 1) break;
  }
  return todos;
}

export default function Templates() {
  const navigate = useNavigate();
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['projetos', 'templates', 'todos'],
    queryFn: () => cadastrosApi.templates(false),
  });
  const { data: categorias = [] } = useQuery({
    queryKey: ['projetos', 'categorias'],
    queryFn: () => cadastrosApi.categorias(false),
  });
  // A lista não traz as horas nem as atividades: busca o detalhe de cada um (são poucos)
  const detalhes = useQueries({
    queries: (templates ?? []).map((t) => ({
      queryKey: ['projetos', 'template', t.id],
      queryFn: () => cadastrosApi.template(t.id),
    })),
  });
  // O planejamento guarda uma cópia do nome do template: o uso conta pelo nome
  const { data: planejamentos } = useQuery({
    queryKey: ['projetos', 'planejamentos', 'todos'],
    queryFn: todosPlanejamentos,
    staleTime: 60_000,
  });
  const uso = (nome: string) => planejamentos?.filter((p) => p.templateNome === nome && p.situacao !== 'CANCELADO').length;

  const lista = [...(templates ?? [])].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Templates</h1>
          <p className="text-sm text-neutral-500 mt-1">Modelos de implantação reaproveitados em cada novo planejamento.</p>
        </div>
        <Button onClick={() => navigate('/projetos/templates/novo')} className="w-full sm:w-auto">
          <Plus size={16} aria-hidden="true" /> Novo template
        </Button>
      </div>

      {error && <ErrorAlert>{mensagemErro(error, 'Não foi possível carregar os templates.')}</ErrorAlert>}
      {isLoading && <div className="h-32 rounded-xl bg-neutral-100 animate-pulse" aria-hidden="true" />}
      {templates && lista.length === 0 && (
        <Card className="text-center py-12">
          <LayoutTemplate size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
          <p className="mt-3 font-medium text-neutral-800">Nenhum template</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {lista.map((t) => {
          const detalhe = detalhes[(templates ?? []).findIndex((x) => x.id === t.id)]?.data;
          const itens = detalhe?.atividades.map(paraEditavelTemplate) ?? [];
          const horas = detalhe ? horasTotais(itens, categorias) : null;
          const raizes = arvoreDe(itens).map((n) => n.item.nome);
          const usado = uso(t.nome);
          return (
            <Card key={t.id} interativo onClick={() => navigate(`/projetos/templates/${t.id}`)} className={t.ativo ? '' : 'opacity-70'}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-semibold text-neutral-900 break-words">
                  {t.nome}
                  {!t.ativo && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600">inativo</span>}
                </h2>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 tabular-nums whitespace-nowrap">
                  v{t.versao} · {t.qtdAtividades} atividade(s){horas != null && ` · ${fmtHoras(horas)}`}
                </span>
              </div>
              {raizes.length > 0 && <p className="mt-2 text-sm text-neutral-500 break-words">{raizes.join(' → ')}</p>}
              <p className="mt-2 text-sm text-neutral-700">
                {usado == null ? ' ' : usado === 0 ? 'Ainda não usado' : `Usado em ${usado} planejamento(s)`}
              </p>
              <p className="mt-1 text-xs text-neutral-400">Atualizado {tempoDesde(instante(t.atualizadoEm))}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
