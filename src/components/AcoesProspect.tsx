import { useEffect, useRef, useState, type KeyboardEvent as EventoTeclado } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, FileSignature, MoreVertical, Rocket, ThumbsDown, XCircle, type LucideIcon } from 'lucide-react';
import { prospeccaoApi } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { useAuthStore } from '../stores/authStore';
import type { SalvarProspectRequest, StatusProspect } from '../types/api';
import { Button } from './Button';
import { ConfirmarExclusao } from './ConfirmarExclusao';
import { FecharContratoModal } from './FecharContratoModal';
import { LtoModal } from './LtoModal';
import { PerdidoModal } from './PerdidoModal';
import { RegistrarVisitaModal } from './RegistrarVisitaModal';

interface Props {
  /** null = lugar da busca que ainda não é prospect: salva antes da primeira ação. */
  prospectId: number | null;
  status: StatusProspect | null;
  /** Última visita com o cliente atendendo (libera Fechar contrato e Perdido). */
  atendeu: boolean;
  nome: string;
  /** Como salvar o lugar da busca (obrigatório quando prospectId é null). */
  salvar?: SalvarProspectRequest;
}

type Modal = 'visita' | 'fechar' | 'perdido' | 'lto';
type Aberto = { tipo: Modal; id: number } | { tipo: 'descartar' } | null;

interface ItemMenu {
  rotulo: string;
  icone: LucideIcon;
  onSelect: () => void;
}

/**
 * Ações do funil no card. NOVO/PERDIDO/DESCARTADO: Visitado. VISITADO + atendeu: Fechar contrato e Perdido
 * (nova visita vai para o menu). FECHADO: LTO. Fechar e LTO são só de COMERCIAL/ADMIN (o backend dá 403 ao TECNICO).
 * Prospect de outro comercial não recebe ações.
 */
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

  const podeFechar = perfil !== 'TECNICO';
  const ocupado = salvarMutation.isPending || descartarMutation.isPending;
  const abrir = (tipo: Modal) => prospectId && setAberto({ tipo, id: prospectId });
  const visitar = () => {
    setErro(null);
    salvarMutation.mutate();
  };

  const negociando = status === 'VISITADO' && atendeu && !!prospectId;
  const fechado = status === 'FECHADO';

  const itensMenu: ItemMenu[] = [];
  if (negociando) itensMenu.push({ rotulo: 'Nova visita', icone: ClipboardCheck, onSelect: visitar });
  if (!fechado && status !== 'DESCARTADO') {
    itensMenu.push({
      rotulo: 'Descartar',
      icone: XCircle,
      onSelect: () => {
        descartarMutation.reset();
        setAberto({ tipo: 'descartar' });
      },
    });
  }

  return (
    <>
      {fechado ? (
        podeFechar && (
          <Button size="sm" className="md:min-h-9" disabled={ocupado} onClick={() => abrir('lto')}>
            <Rocket size={16} aria-hidden="true" />
            LTO
          </Button>
        )
      ) : negociando ? (
        <>
          {podeFechar && (
            <Button size="sm" className="md:min-h-9" disabled={ocupado} onClick={() => abrir('fechar')}>
              <FileSignature size={16} aria-hidden="true" />
              Fechar contrato
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="md:min-h-9"
            disabled={ocupado}
            onClick={() => abrir('perdido')}
          >
            <ThumbsDown size={16} aria-hidden="true" />
            Perdido
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          className="md:min-h-9"
          loading={salvarMutation.isPending}
          disabled={ocupado}
          aria-label={`${status === 'VISITADO' || status === 'PERDIDO' ? 'Registrar nova visita em' : 'Registrar visita em'} ${nome}`}
          onClick={visitar}
        >
          {!salvarMutation.isPending && <ClipboardCheck size={16} aria-hidden="true" />}
          {status === 'VISITADO' || status === 'PERDIDO' ? 'Nova visita' : 'Visitado'}
        </Button>
      )}
      {itensMenu.length > 0 && <MenuProspect nome={nome} disabled={ocupado} itens={itensMenu} />}

      {erro && (
        <p role="alert" className="basis-full text-sm text-red-600">
          {erro}
        </p>
      )}

      {aberto?.tipo === 'visita' && (
        <RegistrarVisitaModal prospectId={aberto.id} nome={nome} onClose={() => setAberto(null)} />
      )}
      {aberto?.tipo === 'fechar' && (
        <FecharContratoModal prospectId={aberto.id} nome={nome} onClose={() => setAberto(null)} />
      )}
      {aberto?.tipo === 'perdido' && (
        <PerdidoModal prospectId={aberto.id} nome={nome} onClose={() => setAberto(null)} />
      )}
      {aberto?.tipo === 'lto' && <LtoModal prospectId={aberto.id} nome={nome} onClose={() => setAberto(null)} />}
      {aberto?.tipo === 'descartar' && (
        <ConfirmarExclusao
          titulo={`Descartar ${nome}?`}
          rotuloConfirmar="Descartar"
          aviso="Use quando não houver interesse ou não for público-alvo."
          onConfirmar={() => descartarMutation.mutate()}
          onCancelar={() => setAberto(null)}
          excluindo={descartarMutation.isPending}
          erro={descartarMutation.isError ? mensagemErro(descartarMutation.error, 'Erro ao descartar') : null}
        >
          <p className="break-words">
            Ele sai da sua lista e fica livre: outro comercial pode assumir. Se você registrar uma nova visita antes
            disso, ele volta para você.
          </p>
        </ConfirmarExclusao>
      )}
    </>
  );
}

/** Menu "mais ações" do card. Fecha no Esc, clicando fora ou ao escolher; setas navegam entre os itens. */
function MenuProspect({ nome, disabled, itens }: { nome: string; disabled: boolean; itens: ItemMenu[] }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    lista.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus();
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

  const setas = (e: EventoTeclado<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const botoes = [...(lista.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])];
    const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
    const proximo = (atual + (e.key === 'ArrowDown' ? 1 : -1) + botoes.length) % botoes.length;
    botoes[proximo]?.focus();
  };

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
          ref={lista}
          role="menu"
          aria-label={`Ações para ${nome}`}
          onKeyDown={setas}
          className="absolute right-0 bottom-full mb-1 z-20 min-w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg animate-fade-in"
        >
          {itens.map(({ rotulo, icone: Icone, onSelect }) => (
            <button
              key={rotulo}
              type="button"
              role="menuitem"
              onClick={() => {
                setAberto(false);
                onSelect();
              }}
              className="w-full flex items-center gap-2 min-h-11 md:min-h-9 px-3 text-sm text-left text-neutral-700 hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none"
            >
              <Icone size={16} className="text-neutral-400" aria-hidden="true" />
              {rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
