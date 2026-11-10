import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cadastrosApi, planejamentosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { ErrorAlert } from '../ErrorAlert';
import { tempoDesde } from '../../labels';
import type { Planejamento } from '../../types/projetos';
import { instante } from '../../projetos';

interface Props {
  planejamentoId: number;
  nomePlanejamento: string;
  /** Já tem atividades: aplicar exige substituir (apaga as atuais). */
  temAtividades: boolean;
  onClose: () => void;
  onAplicado: (p: Planejamento) => void;
}

/** Aplica um template: copia as atividades (sem responsáveis) e leva o planejamento para EM_PLANEJAMENTO. */
export function EscolherTemplateModal({ planejamentoId, nomePlanejamento, temAtividades, onClose, onAplicado }: Props) {
  const qc = useQueryClient();
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [confirmarSubstituir, setConfirmarSubstituir] = useState(false);

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['projetos', 'templates', 'ativos'],
    queryFn: () => cadastrosApi.templates(true),
  });

  const aplicar = useMutation({
    mutationFn: () => planejamentosApi.aplicarTemplate(planejamentoId, templateId!, temAtividades),
    onSuccess: (p) => {
      qc.setQueryData(['projetos', 'planejamento', planejamentoId], p);
      qc.invalidateQueries({ queryKey: ['projetos', 'planejamentos'] });
      onAplicado(p);
    },
  });

  return (
    <Modal title="Escolher template" onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-4">
        <p className="text-sm text-neutral-600">
          As atividades do template são copiadas para <strong>{nomePlanejamento}</strong>, sem responsáveis. Mudar o
          template depois não altera este planejamento.
        </p>
        {error && <ErrorAlert>{mensagemErro(error, 'Não foi possível carregar os templates.')}</ErrorAlert>}
        {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
        {templates && templates.length === 0 && (
          <p className="text-sm text-neutral-500">Nenhum template ativo. Cadastre um em Projetos → Templates.</p>
        )}
        {templates && templates.length > 0 && (
          <ul className="space-y-2" role="radiogroup" aria-label="Templates">
            {templates.map((t) => (
              <li key={t.id}>
                <label
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    templateId === t.id ? 'border-vr-500 bg-vr-50' : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    checked={templateId === t.id}
                    onChange={() => {
                      setTemplateId(t.id);
                      setConfirmarSubstituir(false);
                    }}
                    className="h-5 w-5 text-vr-600 focus:ring-vr-500"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-neutral-900">{t.nome}</span>
                    <span className="block text-xs text-neutral-500">
                      v{t.versao} · {t.qtdAtividades} atividade(s) · atualizado {tempoDesde(instante(t.atualizadoEm))}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {temAtividades && templateId && (
          <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmarSubstituir}
              onChange={(e) => setConfirmarSubstituir(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-amber-300 text-vr-600 focus:ring-vr-500"
            />
            Este planejamento já tem atividades. Entendo que elas serão apagadas e substituídas pelas do template.
          </label>
        )}

        {aplicar.error && <ErrorAlert>{mensagemErro(aplicar.error, 'Não foi possível aplicar o template.')}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={aplicar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => aplicar.mutate()}
            loading={aplicar.isPending}
            disabled={!templateId || (temAtividades && !confirmarSubstituir)}
          >
            Aplicar template
          </Button>
        </div>
      </div>
    </Modal>
  );
}
