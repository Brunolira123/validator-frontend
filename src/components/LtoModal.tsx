import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, Loader2, Search } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { levantamentosApi } from '../api/levantamentos';
import { prospeccaoApi } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { formatarCnpj } from '../labels';
import type { CnpjResponseDTO } from '../types/api';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';
import { Input } from './Input';
import { Modal } from './Modal';
import { CamposLevantamento } from './CamposLevantamento';
import { dadosLevantamento, levantamentoPadrao, levantamentoSchema, type LevantamentoForm } from '../levantamentoForm';

/** Máscara progressiva: 12345678000190 → 12.345.678/0001-90. */
function mascararCnpj(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

interface Props {
  prospectId: number;
  nome: string;
  onClose: () => void;
}

/**
 * LTO: o prospect vira cliente (dados da Receita pelo CNPJ) e ganha uma validação de servidor em rascunho.
 * O selo de perfil só avisa; quem decide seguir é o comercial.
 */
export function LtoModal({ prospectId, nome, onClose }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cnpj, setCnpj] = useState('');
  const [empresa, setEmpresa] = useState<CnpjResponseDTO | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [erroCnpj, setErroCnpj] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LevantamentoForm>({
    resolver: zodResolver(levantamentoSchema),
    defaultValues: levantamentoPadrao,
  });

  const consultaPreco = watch('consultaPreco');
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

  const ltoMutation = useMutation({
    mutationFn: (d: LevantamentoForm) => prospeccaoApi.lto(prospectId, { cnpj: digitos, ...dadosLevantamento(d) }),
    onSuccess: async ({ levantamentoId }) => {
      // Mesmo fluxo da nova validação: gera os equipamentos e, se falhar, o botão fica no levantamento
      try {
        await levantamentosApi.gerarEquipamentos(levantamentoId);
      } catch (e) {
        console.error('Erro ao gerar equipamentos', e);
      }
      queryClient.invalidateQueries({ queryKey: ['prospeccao'] });
      navigate(`/comercial/levantamentos/${levantamentoId}`);
    },
    onError: (e) => setErro(mensagemErro(e, 'Erro ao registrar o LTO')),
  });

  const perfil = empresa?.perfil;

  return (
    <Modal title="LTO" onClose={ltoMutation.isPending ? () => {} : onClose} size="2xl">
      <form
        onSubmit={handleSubmit((d) => {
          if (!empresa) {
            setErroCnpj('Consulte o CNPJ antes de continuar');
            return;
          }
          setErro(null);
          ltoMutation.mutate(d);
        })}
        className="p-4 sm:p-6 space-y-4"
      >
        <p className="text-sm text-neutral-600 break-words">
          <span className="font-semibold text-neutral-900">{nome}</span> vira cliente com os dados da Receita e
          ganha uma validação de servidor.
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
              <p className="font-semibold">Fora do perfil (Lucro Real)</p>
              {perfil.motivo && <p className="mt-0.5">{perfil.motivo}</p>}
              <p className="mt-1 text-xs text-amber-800">Dá para seguir com o LTO mesmo assim.</p>
            </div>
          </div>
        )}

        <div className="pt-2 space-y-4">
          <p className="text-sm font-medium text-neutral-900">Dimensionamento do ambiente</p>
          <CamposLevantamento register={register} errors={errors} consultaPreco={consultaPreco} />
        </div>

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={ltoMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={ltoMutation.isPending} disabled={!empresa}>
            Registrar LTO
          </Button>
        </div>
      </form>
    </Modal>
  );
}
