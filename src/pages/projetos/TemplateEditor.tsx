import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { cadastrosApi } from '../../api/projetos';
import { deveRetentar, mensagemErro } from '../../api/erro';
import { toast } from '../../stores/toastStore';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { ErrorAlert } from '../../components/ErrorAlert';
import { ConfirmarExclusao } from '../../components/ConfirmarExclusao';
import { ArvoreAtividades } from '../../components/projetos/ArvoreAtividades';
import { AtividadeModal } from '../../components/projetos/AtividadeModal';
import { Marcar } from '../../components/projetos/Campos';
import { arvoreDe, horasTotais, type AtividadeEditavel } from '../../components/projetos/atividades';
import { novaChave, paraEditavelTemplate, paraTemplateAtividades } from '../../components/projetos/templateAtividades';
import { descendentes, fmtHoras } from '../../projetos';
import type { Template } from '../../types/projetos';

function Editor({ template }: { template: Template | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nome, setNome] = useState(template?.nome ?? '');
  const [ativo, setAtivo] = useState(template?.ativo ?? true);
  const [itens, setItens] = useState<AtividadeEditavel[]>(() => template?.atividades.map(paraEditavelTemplate) ?? []);
  const [alterado, setAlterado] = useState(false);
  const [editando, setEditando] = useState<{ valor: AtividadeEditavel; novo: boolean } | null>(null);
  const [excluindo, setExcluindo] = useState<AtividadeEditavel | null>(null);
  const [inativando, setInativando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Depois de criar, a troca de rota para /templates/:id não pode cair no aviso de "sair sem salvar"
  const liberado = useRef(false);

  const { data: categorias = [] } = useQuery({
    queryKey: ['projetos', 'categorias'],
    queryFn: () => cadastrosApi.categorias(false),
  });

  const mudar = (novos: AtividadeEditavel[]) => {
    setItens(novos);
    setAlterado(true);
  };

  const salvar = useMutation({
    mutationFn: () => {
      const req = { nome: nome.trim(), ativo, atividades: paraTemplateAtividades(itens) };
      return template ? cadastrosApi.atualizarTemplate(template.id, req) : cadastrosApi.criarTemplate(req);
    },
    onSuccess: (t) => {
      setAlterado(false);
      qc.setQueryData(['projetos', 'template', t.id], t);
      qc.invalidateQueries({ queryKey: ['projetos', 'templates'] });
      toast(template ? `Template salvo (v${t.versao})` : 'Template criado');
      if (!template) {
        liberado.current = true;
        navigate(`/projetos/templates/${t.id}`, { replace: true });
      }
    },
    onError: (e) => setErro(mensagemErro(e, 'Não foi possível salvar o template.')),
  });

  const inativar = useMutation({
    mutationFn: () => cadastrosApi.inativarTemplate(template!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projetos', 'templates'] });
      qc.invalidateQueries({ queryKey: ['projetos', 'template', template!.id] });
      setAtivo(false);
      setInativando(false);
      toast('Template inativado');
    },
  });

  // Sair com alteração não salva pede confirmação
  const bloqueio = useBlocker(
    ({ currentLocation, nextLocation }) =>
      alterado && !liberado.current && currentLocation.pathname !== nextLocation.pathname
  );

  const salvarAtividade = async (v: AtividadeEditavel, novo: boolean) => {
    if (novo) {
      const irmaos = itens.filter((a) => a.chavePai === v.chavePai);
      mudar([...itens, { ...v, chave: novaChave(itens), ordem: Math.max(0, ...irmaos.map((a) => a.ordem)) + 1 }]);
    } else {
      mudar(itens.map((a) => (a.chave === v.chave ? v : a)));
    }
  };

  const mover = (chave: string, direcao: -1 | 1) => {
    const alvo = itens.find((a) => a.chave === chave)!;
    const irmaos = itens.filter((a) => a.chavePai === alvo.chavePai).sort((a, b) => a.ordem - b.ordem);
    const i = irmaos.findIndex((a) => a.chave === chave);
    const outro = irmaos[i + direcao];
    if (!outro) return;
    const [oa, ob] = alvo.ordem === outro.ordem ? [outro.ordem + direcao, alvo.ordem] : [outro.ordem, alvo.ordem];
    mudar(itens.map((a) => (a.chave === alvo.chave ? { ...a, ordem: oa } : a.chave === outro.chave ? { ...a, ordem: ob } : a)));
  };

  const excluir = (alvo: AtividadeEditavel) => {
    const fora = descendentes(arvoreDe(itens), alvo.chave, (a) => a.chave);
    mudar(itens.filter((a) => !fora.has(a.chave)).map((a) => ({ ...a, dependeDe: a.dependeDe.filter((d) => !fora.has(d)) })));
    setExcluindo(null);
  };

  const nova = (chavePai: string | null): AtividadeEditavel => ({
    chave: '',
    chavePai,
    nome: '',
    categoriaId: null,
    horas: null,
    dependeDe: [],
    indivisivel: false,
    doCliente: false,
    diasCliente: 1,
    ordem: Number.MAX_SAFE_INTEGER,
  });

  const enviar = () => {
    if (!nome.trim()) return setErro('Informe o nome do template.');
    setErro(null);
    salvar.mutate();
  };
  const subtarefas = excluindo ? descendentes(arvoreDe(itens), excluindo.chave, (a) => a.chave).size - 1 : 0;

  return (
    <div className="min-w-0">
      <Link
        to="/projetos/templates"
        className="mb-3 -ml-2 inline-flex items-center gap-1.5 min-h-11 md:min-h-8 px-2 rounded-md text-sm text-vr-700 font-medium hover:bg-vr-50"
      >
        <ArrowLeft size={16} /> Templates
      </Link>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-neutral-900 break-words">{template ? template.nome : 'Novo template'}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {template ? `Versão ${template.versao}. Salvar grava a v${template.versao + 1}; planejamentos já criados não mudam.` : 'Começa na versão 1.'}
          </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
          {template && template.ativo && (
            <Button variant="secondary" onClick={() => setInativando(true)}>
              Inativar
            </Button>
          )}
          <Button onClick={enviar} loading={salvar.isPending} disabled={!!template && !alterado}>
            {template ? 'Salvar nova versão' : 'Criar template'}
          </Button>
        </div>
      </div>

      {erro && (
        <div className="mb-4">
          <ErrorAlert>{erro}</ErrorAlert>
        </div>
      )}

      <Card className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
          <Input
            label="Nome"
            value={nome}
            maxLength={200}
            onChange={(e) => {
              setNome(e.target.value);
              setAlterado(true);
            }}
          />
          <Marcar
            checked={ativo}
            onChange={(c) => {
              setAtivo(c);
              setAlterado(true);
            }}
            dica="Inativo não aparece ao escolher template."
          >
            Ativo
          </Marcar>
        </div>
      </Card>

      <Card className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-neutral-900">
            Atividades <span className="text-neutral-400 font-normal">({itens.length} · {fmtHoras(horasTotais(itens, categorias))})</span>
          </h2>
          <Button size="sm" onClick={() => setEditando({ valor: nova(null), novo: true })} className="w-full sm:w-auto">
            <Plus size={16} aria-hidden="true" /> Atividade
          </Button>
        </div>
        <ArvoreAtividades
          itens={itens}
          categorias={categorias}
          onEditar={(chave) => {
            const v = itens.find((a) => a.chave === chave);
            if (v) setEditando({ valor: v, novo: false });
          }}
          onNovaSubtarefa={(chave) => setEditando({ valor: nova(chave), novo: true })}
          onExcluir={(chave) => setExcluindo(itens.find((a) => a.chave === chave) ?? null)}
          onMover={mover}
        />
        <p className="mt-4 text-xs text-neutral-400">
          Horas vazias seguem o padrão da categoria quando o template é aplicado. Responsáveis são escolhidos no planejamento.
        </p>
      </Card>

      {editando && (
        <AtividadeModal
          inicial={editando.valor}
          novo={editando.novo}
          itens={itens}
          categorias={categorias}
          modo="template"
          onSalvar={(v) => salvarAtividade(v, editando.novo)}
          onClose={() => setEditando(null)}
        />
      )}
      {excluindo && (
        <ConfirmarExclusao
          titulo="Remover atividade?"
          rotuloConfirmar="Remover"
          aviso="Só sai do template quando você salvar."
          onConfirmar={() => excluir(excluindo)}
          onCancelar={() => setExcluindo(null)}
          excluindo={false}
        >
          <p>
            <strong>{excluindo.nome}</strong>
            {subtarefas > 0 && ` e ${subtarefas} subtarefa(s)`} sai(em) do template.
          </p>
        </ConfirmarExclusao>
      )}
      {inativando && (
        <ConfirmarExclusao
          titulo="Inativar template?"
          rotuloConfirmar="Inativar"
          aviso="Os planejamentos que já usaram continuam iguais. Dá para reativar marcando Ativo e salvando."
          onConfirmar={() => inativar.mutate()}
          onCancelar={() => setInativando(false)}
          excluindo={inativar.isPending}
          erro={inativar.error ? mensagemErro(inativar.error, 'Não foi possível inativar.') : null}
        >
          <p>
            <strong>{template?.nome}</strong> deixa de aparecer ao escolher template.
          </p>
        </ConfirmarExclusao>
      )}
      {bloqueio.state === 'blocked' && (
        <ConfirmarExclusao
          titulo="Sair sem salvar?"
          rotuloConfirmar="Sair sem salvar"
          aviso="As alterações neste template serão perdidas."
          onConfirmar={() => bloqueio.proceed()}
          onCancelar={() => bloqueio.reset()}
          excluindo={false}
        >
          <p>Você tem alterações que ainda não foram salvas.</p>
        </ConfirmarExclusao>
      )}
    </div>
  );
}

export default function TemplateEditor() {
  const { id } = useParams();
  const novo = id === 'novo';
  const { data, isLoading, error } = useQuery({
    queryKey: ['projetos', 'template', Number(id)],
    queryFn: () => cadastrosApi.template(Number(id)),
    enabled: !novo && Number.isFinite(Number(id)),
    retry: deveRetentar,
    // O editor guarda o estado local: não recarrega por baixo dele
    staleTime: Infinity,
  });

  if (novo) return <Editor template={null} />;
  if (isLoading) return <div className="h-64 rounded-xl bg-neutral-100 animate-pulse" aria-hidden="true" />;
  if (error || !data) return <ErrorAlert>{mensagemErro(error, 'Template não encontrado.')}</ErrorAlert>;
  // key: depois de salvar (nova versão), recomeça do que o servidor devolveu
  return <Editor key={`${data.id}-${data.versao}`} template={data} />;
}
