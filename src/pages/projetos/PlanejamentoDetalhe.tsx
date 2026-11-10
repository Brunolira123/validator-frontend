import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calculator, Lock, Save } from 'lucide-react';
import { errosDoCalculo, planejamentosApi } from '../../api/projetos';
import { deveRetentar, mensagemErro } from '../../api/erro';
import { Button } from '../../components/Button';
import { ErrorAlert } from '../../components/ErrorAlert';
import { SituacaoPlanejamentoBadge } from '../../components/projetos/SituacaoPlanejamentoBadge';
import { SalvarComoTemplateModal } from '../../components/projetos/SalvarComoTemplateModal';
import { AbaDados } from '../../components/projetos/AbaDados';
import { AbaAtividades } from '../../components/projetos/AbaAtividades';
import { AbaDeslocamentos } from '../../components/projetos/AbaDeslocamentos';
import { AbaCronograma } from '../../components/projetos/AbaCronograma';
import { AbaContatos } from '../../components/projetos/AbaContatos';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import { ehEditor, situacaoEditavel } from '../../projetos';
import type { Planejamento } from '../../types/projetos';

const abas = [
  { id: 'dados', label: 'Dados' },
  { id: 'atividades', label: 'Atividades' },
  { id: 'deslocamentos', label: 'Deslocamentos e feriados' },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'contatos', label: 'Contatos', soEditor: true },
] as const;
type AbaId = (typeof abas)[number]['id'];

export default function PlanejamentoDetalhe() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const perfil = useAuthStore((s) => s.usuario?.perfil);
  const editor = ehEditor(perfil);
  const [salvarTemplateAberto, setSalvarTemplateAberto] = useState(false);
  const [errosCalculo, setErrosCalculo] = useState<string[] | null>(null);

  const visiveis = abas.filter((a) => !('soEditor' in a) || editor);
  const abaParam = params.get('aba') as AbaId | null;
  const aba: AbaId = visiveis.some((a) => a.id === abaParam) ? abaParam! : 'atividades';
  const irPara = (nova: AbaId) => setParams((p) => ({ ...Object.fromEntries(p), aba: nova }), { replace: true });

  const { data: p, isLoading, error } = useQuery({
    queryKey: ['projetos', 'planejamento', id],
    queryFn: () => planejamentosApi.buscar(id),
    enabled: Number.isFinite(id),
    retry: deveRetentar,
  });

  const calcular = useMutation({
    mutationFn: () => planejamentosApi.calcular(id),
    onSuccess: (calculo) => {
      setErrosCalculo(null);
      qc.setQueryData<Planejamento>(['projetos', 'planejamento', id], (atual) =>
        atual ? { ...atual, calculo, calculoDesatualizado: false, calculadoEm: calculo.calculadoEm } : atual
      );
      qc.invalidateQueries({ queryKey: ['projetos', 'planejamento', id] });
      qc.invalidateQueries({ queryKey: ['projetos', 'planejamentos'] });
      qc.invalidateQueries({ queryKey: ['projetos', 'carga'] });
      toast('Cronograma calculado');
      irPara('cronograma');
    },
    onError: (e) => {
      setErrosCalculo(errosDoCalculo(e));
      irPara('cronograma');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-8 w-64 rounded bg-neutral-100 animate-pulse" />
        <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" />
      </div>
    );
  }
  if (error || !p) {
    return (
      <div className="space-y-4">
        <Link to="/projetos/planejamentos" className="inline-flex items-center gap-2 text-sm text-vr-700 font-medium hover:underline">
          <ArrowLeft size={16} /> Planejamentos
        </Link>
        <ErrorAlert>{mensagemErro(error, 'Planejamento não encontrado.')}</ErrorAlert>
      </div>
    );
  }

  const editavel = editor && situacaoEditavel(p.situacao);
  const subtitulo = [
    `Cliente ${p.clienteNome}`,
    p.levantamentoId ? `LTO #${p.levantamentoId}` : null,
    p.templateNome ? `Template "${p.templateNome}" v${p.templateVersao}` : null,
  ].filter(Boolean);
  // Erro que não é a lista de validação (409 de situação, rede…) aparece no topo
  const erroCalculoGeral = calcular.error && !errosCalculo ? mensagemErro(calcular.error, 'Não foi possível calcular.') : null;

  return (
    <div className="min-w-0">
      <Link
        to="/projetos/planejamentos"
        className="mb-3 -ml-2 inline-flex items-center gap-1.5 min-h-11 md:min-h-8 px-2 rounded-md text-sm text-vr-700 font-medium hover:bg-vr-50"
      >
        <ArrowLeft size={16} /> Planejamentos
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-900 break-words">{p.nome}</h1>
            <SituacaoPlanejamentoBadge situacao={p.situacao} doLto={!!p.levantamentoId} />
          </div>
          <p className="text-sm text-neutral-500 mt-1">{subtitulo.join(' · ')}</p>
        </div>
        {editavel && (
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
            {p.atividades.length > 0 && (
              <Button variant="secondary" onClick={() => setSalvarTemplateAberto(true)}>
                <Save size={16} aria-hidden="true" /> Salvar como template
              </Button>
            )}
            <Button onClick={() => calcular.mutate()} loading={calcular.isPending}>
              {!calcular.isPending && <Calculator size={16} aria-hidden="true" />}
              {p.calculo ? 'Recalcular cronograma' : 'Calcular cronograma'}
            </Button>
          </div>
        )}
      </div>

      {editor && !situacaoEditavel(p.situacao) && (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
          <Lock size={14} aria-hidden="true" />
          {p.situacao === 'CANCELADO'
            ? 'Cancelado: somente leitura. Volte para "Em planejamento" na aba Dados para editar.'
            : 'Criado no Artia: somente leitura. A execução segue no Artia.'}
        </p>
      )}
      {!editor && (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
          <Lock size={14} aria-hidden="true" /> Somente leitura.
        </p>
      )}
      {erroCalculoGeral && (
        <div className="mb-4">
          <ErrorAlert>{erroCalculoGeral}</ErrorAlert>
        </div>
      )}

      {/* Abas: rolam na horizontal no celular */}
      <div role="tablist" aria-label="Seções do planejamento" className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-4 flex gap-2 overflow-x-auto pb-1">
        {visiveis.map((a) => (
          <button
            key={a.id}
            role="tab"
            type="button"
            aria-selected={aba === a.id}
            onClick={() => irPara(a.id)}
            className={`shrink-0 min-h-11 md:min-h-10 px-4 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 ${
              aba === a.id ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {a.label}
            {a.id === 'cronograma' && p.calculo && p.calculoDesatualizado && (
              <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" aria-label="desatualizado" />
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {aba === 'dados' && <AbaDados p={p} editor={editor} />}
        {aba === 'atividades' && <AbaAtividades p={p} editavel={editavel} editor={editor} />}
        {aba === 'deslocamentos' && <AbaDeslocamentos p={p} editavel={editavel} editor={editor} />}
        {aba === 'cronograma' && (
          <AbaCronograma
            p={p}
            editavel={editavel}
            editor={editor}
            erros={errosCalculo}
            calculando={calcular.isPending}
            onCalcular={() => calcular.mutate()}
          />
        )}
        {aba === 'contatos' && editor && <AbaContatos clienteId={p.clienteId} clienteNome={p.clienteNome} />}
      </div>

      {salvarTemplateAberto && (
        <SalvarComoTemplateModal
          planejamentoId={p.id}
          nomeSugerido={p.templateNome ?? p.nome}
          onClose={() => setSalvarTemplateAberto(false)}
        />
      )}
    </div>
  );
}
