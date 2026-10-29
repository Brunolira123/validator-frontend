import type { HTMLAttributes, ReactNode } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { FotoLugar } from './FotoLugar';
import { DeOutroComercialBadge, StatusProspectBadge } from './StatusProspectBadge';
import { categoriaProspeccaoLabel } from '../labels';
import type { LugarEncontrado, MotivoPerda } from '../types/api';

/** Categorias visíveis no card; o resto vira "+N" (com a lista no title). */
const MAXIMO_CATEGORIAS = 2;

interface Props {
  lugar: LugarEncontrado;
  /** Ações do funil (Visitado, LTO...), ao lado do botão Rota. */
  acoes?: ReactNode;
  /** Linha extra abaixo do status (ex.: data da visita em Meus prospects). */
  detalhe?: ReactNode;
  /** Motivo do PERDIDO no badge (a busca não traz; Meus prospects traz). */
  motivoPerda?: MotivoPerda | null;
}

/**
 * Resultado da busca no estilo do Google: foto em cima, nome, endereço e as ações no rodapé (alinhadas pela base
 * entre os cards da mesma linha da grade). Sem nota, avaliações, telefone ou site: esses campos ficam fora da busca
 * (custo).
 */
export function LugarCard({ lugar, acoes, detalhe, motivoPerda }: Props) {
  const nome = lugar.nome ?? 'Sem nome no Google';
  const fechadoTemporariamente = lugar.statusFuncionamento === 'CLOSED_TEMPORARILY';
  const visiveis = lugar.categorias.slice(0, MAXIMO_CATEGORIAS);
  const restantes = lugar.categorias.slice(MAXIMO_CATEGORIAS).map((c) => categoriaProspeccaoLabel[c]);

  return (
    <article className="h-full bg-white rounded-xl border border-neutral-200 shadow-card overflow-hidden flex flex-col">
      {/* Crédito exigido pelo Google, sobre a própria foto para não desalinhar o rodapé dos cards */}
      <FotoLugar
        fotoUrl={lugar.fotoUrl}
        className="aspect-[5/2] md:aspect-video"
        credito={
          lugar.fotoAutor && (
            <>
              Foto:{' '}
              {lugar.fotoAutorUrl ? (
                <a href={lugar.fotoAutorUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {lugar.fotoAutor}
                </a>
              ) : (
                lugar.fotoAutor
              )}
            </>
          )
        }
      />

      <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-neutral-900 break-words leading-snug">{nome}</h3>
        {(lugar.deOutroComercial || lugar.statusProspect) && (
          <div className="-mt-0.5">
            {lugar.deOutroComercial ? (
              <DeOutroComercialBadge />
            ) : (
              lugar.statusProspect && (
                <StatusProspectBadge
                  status={lugar.statusProspect}
                  temperatura={lugar.temperatura}
                  motivoPerda={motivoPerda}
                />
              )
            )}
          </div>
        )}
        {detalhe}

        {lugar.endereco && (
          <p className="flex items-start gap-1.5 text-sm text-neutral-600" title={lugar.endereco}>
            <MapPin size={14} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
            <span className="break-words line-clamp-2">{lugar.endereco}</span>
          </p>
        )}

        {fechadoTemporariamente && (
          <p className="text-xs font-medium text-amber-800">Fechado temporariamente, segundo o Google</p>
        )}

        {lugar.categorias.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Encontrado como">
            {visiveis.map((c) => (
              <li key={c} className="text-xs text-neutral-600 bg-neutral-100 rounded-md px-2 py-0.5">
                {categoriaProspeccaoLabel[c]}
              </li>
            ))}
            {restantes.length > 0 && (
              <li
                title={restantes.join(', ')}
                className="text-xs font-medium text-neutral-500 bg-neutral-100 rounded-md px-2 py-0.5"
              >
                <span aria-hidden="true">+{restantes.length}</span>
                <span className="sr-only">{restantes.join(', ')}</span>
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
          <a
            href={lugar.rotaUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Rota até ${nome}`}
            className="inline-flex items-center justify-center gap-2 min-h-11 md:min-h-9 px-3 py-1.5 text-sm font-semibold rounded-lg bg-white border border-neutral-300 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-2"
          >
            <Navigation size={16} aria-hidden="true" />
            Rota
          </a>
          {acoes}
        </div>
      </div>
    </article>
  );
}

/** Placeholder do card enquanto carrega, com a mesma proporção de foto. */
export function LugarCardSkeleton() {
  return (
    <div className="h-full bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col">
      <div className="aspect-[5/2] md:aspect-video bg-neutral-100 animate-pulse" />
      <div className="flex-1 p-4 space-y-3">
        <div className="h-4 w-2/3 rounded bg-neutral-100 animate-pulse" />
        <div className="h-3 w-full rounded bg-neutral-100 animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-neutral-100 animate-pulse" />
        <div className="h-9 w-24 rounded-lg bg-neutral-100 animate-pulse" />
      </div>
    </div>
  );
}

/** Grade dos cards: 1 coluna no celular, 2 a partir de md, 3 em xl e 4 em 2xl. */
export function GradeLugares({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  );
}
