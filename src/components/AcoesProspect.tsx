import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, MoreVertical, Rocket, XCircle } from 'lucide-react';
import { prospeccaoApi } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { useAuthStore } from '../stores/authStore';
import type { SalvarProspectRequest, StatusProspect } from '../types/api';
import { Button } from './Button';
import { ConfirmarExclusao } from './ConfirmarExclusao';
import { LtoModal } from './LtoModal';
import { RegistrarVisitaModal } from './RegistrarVisitaModal';

interface Props {
  /** null = lugar da busca que ainda não é prospect: salva antes da primeira ação. */
  prospectId: number | null;
  status: StatusProspect | null;
  /** Última visita com o cliente atendendo (libera o LTO). */
  atendeu: boolean;
  nome: string;
  /** Como salvar o lugar da busca (obrigatório quando prospectId é null). */
  salvar?: SalvarProspectRequest;
}

type Aberto = { tipo: 'visita' | 'lto'; id: number } | { tipo: 'descartar' } | null;

/** Ações do funil no card: Visitado, LTO e o menu com Descartar. Prospect de outro comercial não recebe ações. */
export function AcoesProspect({ prospectId, status, atendeu, nome, salvar }: Props) {
  const queryClient = useQueryClient();
  const perfil = useAuthStore((s) => s.usuario?.perfil);
  const [aberto, setAberto] = useState<Aberto>(null);
  const [erro, setErro] = useState<string | null>(null);

  /** Id do prospect, salvando o lugar antes se preciso (201 e 200 dão no mesmo; 409 vira erro). */
  const garantirProspect = async () => {
    if (prospectId) return prospectId;
    if (!salvar) throw new Error('Lugar sem dados para salvar');
    const { prospect } = await prospeccaoApi.salvar(salvar);
    queryClient.invalidateQueries({ queryKey: ['prospeccao'] });
    return prospect.id;
  };

  const salvarMutation = useMutation({
    mutationFn: garantirProspect,
    onSuccess: (id) => setAberto({ tipo: 'visita', id }),
    onError: (e) => setErro(mensagemErro(e, 'Erro ao salvar o prospect')),
  });

  const descartarMutation = useMutation({
    mutationFn: async () => prospeccaoApi.descartar(await garantirProspect()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['prospeccao'] });
      setAberto(null);
    },
  });

  if (status === 'LTO') return null;

  const ocupado = salvarMutation.isPending || descartarMutation.isPending;
  const podeLto = status === 'VISITADO' && atendeu && !!prospectId && perfil !== 'TECNICO';
  const visitado = status === 'VISITADO';

  return (
    <>
      {podeLto && (
        <Button
          size="sm"
          className="md:min-h-9"
          disabled={ocupado}
          onClick={() => setAberto({ tipo: 'lto', id: prospectId })}
        >
          <Rocket size={16} aria-hidden="true" />
          LTO
        </Button>
      )}
      <Button
        size="sm"
        variant={podeLto ? 'secondary' : 'primary'}
        className="md:min-h-9"
        loading={salvarMutation.isPending}
        disabled={ocupado}
        aria-label={`${visitado ? 'Registrar nova visita em' : 'Registrar visita em'} ${nome}`}
        onClick={() => {
          setErro(null);
          salvarMutation.mutate();
        }}
      >
        {!salvarMutation.isPending && <ClipboardCheck size={16} aria-hidden="true" />}
        {visitado ? 'Nova visita' : 'Visitado'}
      </Button>
      {status !== 'DESCARTADO' && (
        <MenuProspect
          nome={nome}
          disabled={ocupado}
          onDescartar={() => {
            descartarMutation.reset();
            setAberto({ tipo: 'descartar' });
          }}
        />
      )}

      {erro && (
        <p role="alert" className="basis-full text-sm text-red-600">
          {erro}
        </p>
      )}

      {aberto?.tipo === 'visita' && (
        <RegistrarVisitaModal prospectId={aberto.id} nome={nome} onClose={() => setAberto(null)} />
      )}
      {aberto?.tipo === 'lto' && <LtoModal prospectId={aberto.id} nome={nome} onClose={() => setAberto(null)} />}
      {aberto?.tipo === 'descartar' && (
        <ConfirmarExclusao
          titulo="Descartar prospect?"
          rotuloConfirmar="Descartar"
          aviso="Sai do funil, mas continua em Meus prospects (filtro Descartado). Uma nova visita traz de volta."
          onConfirmar={() => descartarMutation.mutate()}
          onCancelar={() => setAberto(null)}
          excluindo={descartarMutation.isPending}
          erro={descartarMutation.isError ? mensagemErro(descartarMutation.error, 'Erro ao descartar') : null}
        >
          <p className="break-words">
            <span className="font-medium text-neutral-900">{nome}</span> não tem interesse ou não é público-alvo.
          </p>
        </ConfirmarExclusao>
      )}
    </>
  );
}

/** Menu "mais ações" do card. Fecha no Esc, clicando fora ou ao escolher. */
function MenuProspect({ nome, disabled, onDescartar }: { nome: string; disabled: boolean; onDescartar: () => void }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const primeiroItem = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    primeiroItem.current?.focus();
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAberto(false);
      botao.current?.focus();
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative ml-auto">
      <button
        ref={botao}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Mais ações para ${nome}`}
        disabled={disabled}
        onClick={() => setAberto((a) => !a)}
        className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500"
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {aberto && (
        <div
          role="menu"
          aria-label={`Ações para ${nome}`}
          className="absolute right-0 bottom-full mb-1 z-20 min-w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg animate-fade-in"
        >
          <button
            ref={primeiroItem}
            type="button"
            role="menuitem"
            onClick={() => {
              setAberto(false);
              onDescartar();
            }}
            className="w-full flex items-center gap-2 min-h-11 md:min-h-9 px-3 text-sm text-left text-neutral-700 hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none"
          >
            <XCircle size={16} className="text-neutral-400" aria-hidden="true" />
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}
