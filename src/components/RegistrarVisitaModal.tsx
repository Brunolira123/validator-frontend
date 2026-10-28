import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DoorClosed, Handshake, MapPin } from 'lucide-react';
import { prospeccaoApi } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { temperaturaLabel } from '../labels';
import type { TemperaturaNegociacao } from '../types/api';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';
import { Modal } from './Modal';

const TAMANHO_MAXIMO_OBSERVACAO = 500;

const schema = z
  .object({
    resultado: z.enum(['ATENDEU', 'NAO_ATENDEU'], { error: 'Diga se o cliente atendeu' }),
    temperatura: z.enum(['FRIA', 'MORNA', 'QUENTE']).optional(),
    observacao: z.string().max(TAMANHO_MAXIMO_OBSERVACAO, `No máximo ${TAMANHO_MAXIMO_OBSERVACAO} caracteres`),
  })
  .superRefine((d, ctx) => {
    if (d.resultado === 'ATENDEU' && !d.temperatura) {
      ctx.addIssue({ code: 'custom', path: ['temperatura'], message: 'Escolha a temperatura da negociação' });
    }
  });

type FormData = z.infer<typeof schema>;

const temperaturas: { valor: TemperaturaNegociacao; descricao: string; marcada: string; dot: string }[] = [
  { valor: 'FRIA', descricao: 'Sem interesse agora', marcada: 'border-blue-500 bg-blue-50 text-blue-800', dot: 'bg-blue-500' },
  { valor: 'MORNA', descricao: 'Quer pensar', marcada: 'border-amber-500 bg-amber-50 text-amber-900', dot: 'bg-amber-500' },
  { valor: 'QUENTE', descricao: 'Quer avançar', marcada: 'border-red-500 bg-red-50 text-red-800', dot: 'bg-red-500' },
];

type Localizacao = { latitude: number; longitude: number };

interface Props {
  prospectId: number;
  nome: string;
  onClose: () => void;
}

/** Registro da visita na loja: atendeu ou não e, se atendeu, como ficou a negociação. */
export function RegistrarVisitaModal({ prospectId, nome, onClose }: Props) {
  const queryClient = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);
  // Só anexa se o aparelho liberar rápido; nunca segura o registro
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (montado.current) setLocalizacao({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      },
      () => {
        // Negou ou sem sinal: a visita vai sem coordenadas
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5 * 60_000 }
    );
    return () => {
      montado.current = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { observacao: '' },
  });

  const resultado = watch('resultado');
  const temperatura = watch('temperatura');
  const observacao = watch('observacao') ?? '';

  const visitaMutation = useMutation({
    mutationFn: (d: FormData) =>
      prospeccaoApi.registrarVisita(prospectId, {
        resultado: d.resultado,
        temperatura: d.resultado === 'ATENDEU' ? d.temperatura : undefined,
        observacao: d.observacao.trim() || undefined,
        ...localizacao,
      }),
    onSuccess: async () => {
      // A resposta vem sem os dados do Google: recarrega busca e lista em vez de trocar o card
      await queryClient.invalidateQueries({ queryKey: ['prospeccao'] });
      onClose();
    },
    onError: (e) => setErro(mensagemErro(e, 'Erro ao registrar a visita')),
  });

  const escolherResultado = (r: FormData['resultado']) => {
    setValue('resultado', r, { shouldValidate: true });
    if (r === 'NAO_ATENDEU') setValue('temperatura', undefined);
  };

  const opcaoResultado = (valor: FormData['resultado'], titulo: string, descricao: string, Icone: typeof Handshake) => {
    const marcada = resultado === valor;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={marcada}
        onClick={() => escolherResultado(valor)}
        className={`flex flex-col items-center justify-center gap-2 min-h-28 p-4 rounded-xl border-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-2 ${
          marcada ? 'border-vr-600 bg-vr-50 text-vr-900' : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
        }`}
      >
        <Icone size={28} aria-hidden="true" className={marcada ? 'text-vr-600' : 'text-neutral-400'} />
        <span className="font-semibold">{titulo}</span>
        <span className="text-xs text-neutral-500">{descricao}</span>
      </button>
    );
  };

  return (
    <Modal title="Registrar visita" onClose={visitaMutation.isPending ? () => {} : onClose}>
      <form
        onSubmit={handleSubmit((d) => {
          setErro(null);
          visitaMutation.mutate(d);
        })}
        className="p-4 sm:p-6 space-y-5"
      >
        <p className="text-sm text-neutral-600 break-words">
          Como foi a visita em <span className="font-semibold text-neutral-900">{nome}</span>?
        </p>

        <div>
          <div role="radiogroup" aria-label="Resultado da visita" className="grid grid-cols-2 gap-3">
            {opcaoResultado('ATENDEU', 'Cliente atende', 'Conversei com o responsável', Handshake)}
            {opcaoResultado('NAO_ATENDEU', 'Cliente não atende', 'Fechado ou sem responsável', DoorClosed)}
          </div>
          {errors.resultado && <p className="text-xs text-red-500 mt-1">{errors.resultado.message}</p>}
        </div>

        {resultado === 'ATENDEU' && (
          <div className="animate-fade-in">
            <p id="visita-temperatura" className="text-sm font-medium text-neutral-700 mb-2">
              Temperatura da negociação
            </p>
            <div role="radiogroup" aria-labelledby="visita-temperatura" className="grid grid-cols-3 gap-2">
              {temperaturas.map((t) => {
                const marcada = temperatura === t.valor;
                return (
                  <button
                    key={t.valor}
                    type="button"
                    role="radio"
                    aria-checked={marcada}
                    onClick={() => setValue('temperatura', t.valor, { shouldValidate: true })}
                    className={`flex flex-col items-center justify-center gap-1 min-h-16 px-2 py-2 rounded-xl border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-2 ${
                      marcada ? t.marcada : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 font-semibold text-sm">
                      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${t.dot}`} />
                      {temperaturaLabel[t.valor]}
                    </span>
                    <span className="text-[11px] leading-tight text-neutral-500">{t.descricao}</span>
                  </button>
                );
              })}
            </div>
            {errors.temperatura && <p className="text-xs text-red-500 mt-1">{errors.temperatura.message}</p>}
          </div>
        )}

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <label htmlFor="visita-observacao" className="text-sm font-medium text-neutral-700">
              Observação (opcional)
            </label>
            <span className="text-xs text-neutral-400 tabular-nums" aria-hidden="true">
              {observacao.length}/{TAMANHO_MAXIMO_OBSERVACAO}
            </span>
          </div>
          <textarea
            id="visita-observacao"
            rows={3}
            maxLength={TAMANHO_MAXIMO_OBSERVACAO}
            aria-invalid={!!errors.observacao}
            {...register('observacao')}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vr-500"
            placeholder="Com quem falou, sistema atual, melhor horário..."
          />
          {errors.observacao && <p className="text-xs text-red-500 mt-1">{errors.observacao.message}</p>}
        </div>

        {localizacao && (
          <p className="flex items-center gap-1.5 text-xs text-neutral-500">
            <MapPin size={14} aria-hidden="true" />
            Localização da visita anexada
          </p>
        )}

        {erro && <ErrorAlert>{erro}</ErrorAlert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={visitaMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={visitaMutation.isPending}>
            Registrar visita
          </Button>
        </div>
      </form>
    </Modal>
  );
}
