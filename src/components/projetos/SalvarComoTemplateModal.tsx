import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cadastrosApi, planejamentosApi } from '../../api/projetos';
import { mensagemErro } from '../../api/erro';
import { toast } from '../../stores/toastStore';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';
import { ErrorAlert } from '../ErrorAlert';
import { selectCls } from './atividades';

/** Guarda as atividades do planejamento (sem pessoas) como template novo ou como nova versão de um existente. */
export function SalvarComoTemplateModal({
  planejamentoId,
  nomeSugerido,
  onClose,
}: {
  planejamentoId: number;
  nomeSugerido: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [modo, setModo] = useState<'novo' | 'versao'>('novo');
  const [nome, setNome] = useState(nomeSugerido);
  const [templateId, setTemplateId] = useState<number | null>(null);

  const { data: templates } = useQuery({
    queryKey: ['projetos', 'templates', 'todos'],
    queryFn: () => cadastrosApi.templates(false),
  });

  const salvar = useMutation({
    mutationFn: () =>
      planejamentosApi.salvarComoTemplate(planejamentoId, modo === 'novo' ? { nome: nome.trim() } : { templateId: templateId! }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['projetos', 'templates'] });
      qc.invalidateQueries({ queryKey: ['projetos', 'template', t.id] });
      toast(modo === 'novo' ? `Template "${t.nome}" criado` : `Template "${t.nome}" agora está na v${t.versao}`);
      onClose();
    },
  });

  const valido = modo === 'novo' ? !!nome.trim() : !!templateId;

  return (
    <Modal title="Salvar como template" onClose={onClose}>
      <form
        className="p-4 sm:p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) salvar.mutate();
        }}
      >
        <p className="text-sm text-neutral-600">
          Leva as atividades, a hierarquia e as dependências. Responsáveis e divisão ficam de fora. Horas iguais ao padrão
          da categoria passam a seguir a categoria.
        </p>
        <fieldset className="space-y-2">
          <legend className="sr-only">Como salvar</legend>
          <label className="flex items-center gap-3 min-h-11 cursor-pointer">
            <input type="radio" checked={modo === 'novo'} onChange={() => setModo('novo')} className="h-5 w-5 text-vr-600 focus:ring-vr-500" />
            <span className="text-sm font-medium text-neutral-800">Template novo</span>
          </label>
          <label className="flex items-center gap-3 min-h-11 cursor-pointer">
            <input
              type="radio"
              checked={modo === 'versao'}
              onChange={() => setModo('versao')}
              className="h-5 w-5 text-vr-600 focus:ring-vr-500"
            />
            <span className="text-sm font-medium text-neutral-800">Nova versão de um template existente</span>
          </label>
        </fieldset>

        {modo === 'novo' ? (
          <Input label="Nome do template" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={200} autoFocus />
        ) : (
          <div>
            <label htmlFor="tpl-versao" className="block text-sm font-medium text-neutral-700 mb-1">
              Template
            </label>
            <select
              id="tpl-versao"
              className={selectCls}
              value={templateId ?? ''}
              onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Escolha…</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} (v{t.versao} → v{t.versao + 1}){t.ativo ? '' : ' · inativo'}
                </option>
              ))}
            </select>
          </div>
        )}

        {salvar.error && <ErrorAlert>{mensagemErro(salvar.error, 'Não foi possível salvar o template.')}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={salvar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={salvar.isPending} disabled={!valido}>
            Salvar template
          </Button>
        </div>
      </form>
    </Modal>
  );
}
