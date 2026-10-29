import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Building2, Loader2, Search } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { prospeccaoApi } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { formatarCnpj, hojeIso, mascararCnpj } from '../labels';
import type { CnpjResponseDTO } from '../types/api';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';
import { Input } from './Input';
import { Modal } from './Modal';

const TAMANHO_MAXIMO_OBSERVACAO = 500;

interface Props {
  prospectId: number;
  nome: string;
  onClose: () => void;
}

/**
 * Fechamento do contrato: o prospect vira cliente com os dados da Receita pelo CNPJ.
 * O selo de perfil só avisa; quem decide seguir é o comercial. O levantamento vem depois, no LTO.
 */
export function FecharContratoModal({ prospectId, nome, onClose }: Props) {
  const queryClient = useQueryClient();
  const hoje = hojeIso();
  const [cnpj, setCnpj] = useState('');
  const [empresa, setEmpresa] = useState<CnpjResponseDTO | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [erroCnpj, setErroCnpj] = useState<string | null>(null);
  const [data, setData] = useState(hoje);
  const [erroData, setErroData] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const digitos = cnpj.replace(/\D/g, '');

  const consultar = async () => {
    if (digitos.length !== 14) {
      setErroCnpj('CNPJ precisa ter 14 dígitos');
      return;
    }
    setConsultando(true);
    setErroCnpj(null);
    setEmpresa(null);
    try {
      setEmpresa(await clientesApi.consultarCnpj(digitos));
    } catch (e) {
      setErroCnpj(mensagemErro(e, 'Erro ao consultar CNPJ'));
    } finally {
      setConsultando(false);
    }
  };

  const fecharMutation = useMutation({
    mutationFn: () =>
      prospeccaoApi.fechar(prospectId, {
        cnpj: digitos,
        dataFechamento: data,
        observacao: observacao.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['prospeccao'] });
      onClose();
    },
    onError: (e) => setErro(mensagemErro(e, 'Erro ao fechar o contrato')),
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!empresa) {
      setErroCnpj('Consulte o CNPJ antes de continuar');
      return;
    }
    if (!data || data > hoje) {
      setErroData('Informe uma data até hoje');
      return;
    }
    setErro(null);
    fecharMutation.mutate();
  };

  const perfil = empresa?.perfil;

  return (
    <Modal title="Fechar contrato" onClose={fecharMutation.isPending ? () => {} : onClose} size="2xl">
      <form onSubmit={enviar} noValidate className="p-4 sm:p-6 space-y-4">
        <p className="text-sm text-neutral-600 break-words">
          <span className="font-semibold text-neutral-900">{nome}</span> vira cliente com os dados da Receita. A
          validação de servidor vem depois, no LTO.
        </p>

        <div className="flex gap-2 items-end">
          <div className="flex-1 min-w-0">
            <Input
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              autoComplete="off"
              value={cnpj}
              onChange={(e) => {
                setCnpj(mascararCnpj(e.target.value));
                // CNPJ mudou: a empresa consultada não vale mais
                setEmpresa(null);
                setErroCnpj(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  consultar();
                }
              }}
              error={erroCnpj ?? undefined}
            />
          </div>
          <Button type="button" variant="secondary" onClick={consultar} disabled={consultando}>
            {consultando ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Search size={16} aria-hidden="true" />
            )}
            Consultar
          </Button>
        </div>

        {empresa && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 flex gap-3 animate-fade-in" aria-live="polite">
            <Building2 size={20} className="shrink-0 mt-0.5 text-neutral-400" aria-hidden="true" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-neutral-900 break-words">{empresa.razaoSocial}</p>
              {empresa.nomeFantasia && <p className="text-neutral-600 break-words">{empresa.nomeFantasia}</p>}
              <p className="text-xs text-neutral-500 mt-1 tabular-nums">{formatarCnpj(empresa.cnpj)}</p>
              {(empresa.endereco || empresa.cidade) && (
                <p className="text-xs text-neutral-500 break-words">
                  {[empresa.endereco, empresa.cidade && `${empresa.cidade}${empresa.uf ? ` - ${empresa.uf}` : ''}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>
        )}

        {perfil?.foraDoPerfil && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-3 text-sm text-amber-900">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">Fora do perfil{perfil.motivo ? `: ${perfil.motivo}` : ''}</p>
              <p className="mt-1 text-xs text-amber-800">O público-alvo é Lucro Real. Dá para fechar mesmo assim.</p>
            </div>
          </div>
        )}

        <div className="sm:w-56">
          <Input
            label="Data do fechamento"
            type="date"
            value={data}
            max={hoje}
            onChange={(e) => {
              setData(e.target.value);
              setErroData(null);
            }}
            error={erroData ?? undefined}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="fechar-observacao" className="text-sm font-medium text-neutral-700">
              Observação (opcional)
            </label>
            <span className="text-xs text-neutral-400 tabular-nums" aria-hidden="true">
              {observacao.length}/{TAMANHO_MAXIMO_OBSERVACAO}
            </span>
          </div>
          <textarea
            id="fechar-observacao"
            rows={3}
            maxLength={TAMANHO_MAXIMO_OBSERVACAO}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
            placeholder="Plano, prazo de implantação, contato..."
          />
        </div>

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={fecharMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={fecharMutation.isPending} disabled={!empresa}>
            Fechar contrato
          </Button>
        </div>
      </form>
    </Modal>
  );
}
