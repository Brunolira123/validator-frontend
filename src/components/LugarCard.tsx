import type { ReactNode } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { FotoLugar } from './FotoLugar';
import { DeOutroComercialBadge, StatusProspectBadge } from './StatusProspectBadge';
import { categoriaProspeccaoLabel } from '../labels';
import type { LugarEncontrado } from '../types/api';

interface Props {
  lugar: LugarEncontrado;
  /** Ações do funil (Visitado, LTO...), ao lado do botão Rota. */
  acoes?: ReactNode;
  /** Linha extra abaixo do status (ex.: data da visita em Meus prospects). */
  detalhe?: ReactNode;
}

/**
 * Resultado da busca no estilo do Google: foto, nome, endereço e o caminho até a loja.
 * Sem nota, avaliações, telefone ou site: esses campos ficam fora da busca (custo).
 */
export function LugarCard({ lugar, acoes, detalhe }: Props) {
  const nome = lugar.nome ?? 'Sem nome no Google';
  const fechadoTemporariamente = lugar.statusFuncionamento === 'CLOSED_TEMPORARILY';

  return (
    <article className="bg-white rounded-xl border border-neutral-200 shadow-card overflow-hidden flex flex-col sm:flex-row">
      <FotoLugar fotoUrl={lugar.fotoUrl} className="aspect-[5/2] sm:aspect-auto sm:w-36 sm:shrink-0" />

      <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-neutral-900 break-words leading-snug">{nome}</h3>
        {(lugar.deOutroComercial || lugar.statusProspect) && (
          <div className="-mt-0.5">
            {lugar.deOutroComercial ? (
              <DeOutroComercialBadge />
            ) : (
              lugar.statusProspect && (
                <StatusProspectBadge status={lugar.statusProspect} temperatura={lugar.temperatura} />
              )
            )}
          </div>
        )}
        {detalhe}

        {lugar.endereco && (
          <p className="flex items-start gap-1.5 text-sm text-neutral-600">
            <MapPin size={14} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
            <span className="break-words">{lugar.endereco}</span>
          </p>
        )}

        {fechadoTemporariamente && (
          <p className="text-xs font-medium text-amber-800">Fechado temporariamente, segundo o Google</p>
        )}

        {lugar.categorias.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Encontrado como">
            {lugar.categorias.map((c) => (
              <li key={c} className="text-xs text-neutral-600 bg-neutral-100 rounded-md px-2 py-0.5">
                {categoriaProspeccaoLabel[c]}
              </li>
            ))}
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

        {lugar.fotoUrl && lugar.fotoAutor && (
          <p className="text-[11px] text-neutral-500 truncate">
            Foto:{' '}
            {lugar.fotoAutorUrl ? (
              <a
                href={lugar.fotoAutorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-neutral-700"
              >
                {lugar.fotoAutor}
              </a>
            ) : (
              lugar.fotoAutor
            )}
          </p>
        )}
      </div>
    </article>
  );
}
