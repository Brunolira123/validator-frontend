import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Input } from './Input';
import type { LevantamentoForm } from '../levantamentoForm';

interface Props {
  register: UseFormRegister<LevantamentoForm>;
  errors: FieldErrors<LevantamentoForm>;
  /** watch('consultaPreco') do formulário dono. */
  consultaPreco: boolean;
}

export function CamposLevantamento({ register, errors, consultaPreco }: Props) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Servidores"
          type="number"
          inputMode="numeric"
          min={0}
          error={errors.qtdServidores?.message}
          {...register('qtdServidores', { valueAsNumber: true })}
        />
        <Input
          label="PDVs"
          type="number"
          inputMode="numeric"
          min={0}
          error={errors.qtdPdvs?.message}
          {...register('qtdPdvs', { valueAsNumber: true })}
        />
        <Input
          label="Retaguardas"
          type="number"
          inputMode="numeric"
          min={0}
          error={errors.qtdRetaguardas?.message}
          {...register('qtdRetaguardas', { valueAsNumber: true })}
        />
      </div>

      <label
        htmlFor="consultaPreco"
        className="flex items-center gap-3 min-h-11 text-sm text-neutral-700 cursor-pointer"
      >
        <input
          type="checkbox"
          id="consultaPreco"
          {...register('consultaPreco')}
          className="w-5 h-5 text-vr-600 border-neutral-300 rounded focus:ring-vr-500"
        />
        Possui consulta de preço?
      </label>

      {consultaPreco && (
        <Input
          label="Quantidade de consultas de preço"
          type="number"
          inputMode="numeric"
          min={0}
          error={errors.qtdConsultaPreco?.message}
          {...register('qtdConsultaPreco', { valueAsNumber: true })}
        />
      )}

      <div>
        <label htmlFor="outros" className="block text-sm font-medium text-neutral-700 mb-1">
          Outros (opcional)
        </label>
        <textarea
          id="outros"
          {...register('outros')}
          rows={3}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
          placeholder="Informações adicionais..."
        />
      </div>
    </>
  );
}
