import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CloudOff, Inbox, MapPin, Store } from 'lucide-react';
import { prospeccaoApi } from '../api/prospeccao';
import { mensagemErro } from '../api/erro';
import { useIsAdmin } from '../stores/authStore';
import { categoriaProspeccaoLabel, formatarData, formatarDataHora, statusProspectLabel, temperaturaLabel } from '../labels';
import type { ProspectResponse, StatusProspect, TemperaturaNegociacao } from '../types/api';
import { AcoesProspect } from './AcoesProspect';
import { Button } from './Button';
import { Card } from './Card';
import { ErrorAlert } from './ErrorAlert';
import { GradeLugares, LugarCard, LugarCardSkeleton } from './LugarCard';
import { StatusProspectBadge } from './StatusProspectBadge';

const TAMANHO_PAGINA = 20;

const seletor =
  'w-full min-h-11 md:min-h-9 px-3 py-2 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-vr-500';

/** Prospects salvos (os seus; ADMIN e DIRETORIA veem todos), com os dados do Google da página exibida. */
export function MeusProspects() {
  const isAdmin = useIsAdmin();
  const [status, setStatus] = useState<StatusProspect | ''>('');
  const [temperatura, setTemperatura] = useState<TemperaturaNegociacao | ''>('');
  const [pagina, setPagina] = useState(0);

  const lista = useQuery({
    queryKey: ['prospeccao', 'prospects', { status, temperatura, pagina }],
    queryFn: () =>
      prospeccaoApi.listar({
        status: status || undefined,
        temperatura: temperatura || undefined,
        pagina,
        tamanho: TAMANHO_PAGINA,
      }),
    placeholderData: keepPreviousData,
  });

  const dados = lista.data;
  const filtrando = status !== '' || temperatura !== '';

  return (
    <section aria-label="Meus prospects">
      <div className="grid grid-cols-2 sm:flex sm:items-end gap-3 mb-4">
        <div className="sm:w-44">
          <label htmlFor="filtro-status" className="block text-sm font-medium text-neutral-700 mb-1">
            Status
          </label>
          <select
            id="filtro-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusProspect | '');
              setPagina(0);
            }}
            className={seletor}
          >
            <option value="">Todos</option>
            {(Object.keys(statusProspectLabel) as StatusProspect[]).map((s) => (
              <option key={s} value={s}>
                {statusProspectLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-44">
          <label htmlFor="filtro-temperatura" className="block text-sm font-medium text-neutral-700 mb-1">
            Temperatura
          </label>
          <select
            id="filtro-temperatura"
            value={temperatura}
            onChange={(e) => {
              setTemperatura(e.target.value as TemperaturaNegociacao | '');
              setPagina(0);
            }}
            className={seletor}
          >
            <option value="">Todas</option>
            {(Object.keys(temperaturaLabel) as TemperaturaNegociacao[]).map((t) => (
              <option key={t} value={t}>
                {temperaturaLabel[t]}
              </option>
            ))}
          </select>
        </div>
        {dados && (
          <p className="col-span-2 sm:ml-auto text-sm text-neutral-600 sm:pb-2" aria-live="polite">
            <span className="font-semibold text-neutral-900 tabular-nums">{dados.total}</span>{' '}
            {dados.total === 1 ? 'prospect' : 'prospects'}
          </p>
        )}
      </div>

      {lista.isPending && (
        <GradeLugares aria-busy="true" aria-label="Carregando prospects">
          {Array.from({ length: 8 }, (_, i) => (
            <LugarCardSkeleton key={i} />
          ))}
        </GradeLugares>
      )}

      {lista.isError && <ErrorAlert>{mensagemErro(lista.error, 'Erro ao carregar os prospects')}</ErrorAlert>}

      {dados && dados.prospects.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <Inbox size={32} className="mx-auto text-neutral-300" aria-hidden="true" />
            <p className="text-neutral-600 mt-3">
              {filtrando ? 'Nenhum prospect com esses filtros.' : 'Você ainda não tem prospects.'}
            </p>
            {!filtrando && (
              <p className="text-sm text-neutral-500 mt-1">Na busca, toque em Visitado num lugar para começar.</p>
            )}
          </div>
        </Card>
      )}

      {dados && dados.prospects.length > 0 && (
        <>
          <GradeLugares className={`transition-opacity ${lista.isPlaceholderData ? 'opacity-60' : ''}`}>
            {dados.prospects.map((p) => (
              <ProspectCard key={p.id} prospect={p} mostrarResponsavel={isAdmin} />
            ))}
          </GradeLugares>

          {dados.totalPaginas > 1 && (
            <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="md:min-h-9"
                disabled={pagina === 0 || lista.isFetching}
                onClick={() => setPagina((p) => p - 1)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Anterior
              </Button>
              <span className="text-sm text-neutral-600 tabular-nums">
                {pagina + 1} de {dados.totalPaginas}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="md:min-h-9"
                disabled={pagina + 1 >= dados.totalPaginas || lista.isFetching}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </nav>
          )}

          <p className="mt-6 text-xs text-neutral-500 text-center">Dados e fotos: Google Maps</p>
        </>
      )}
    </section>
  );
}

function ProspectCard({ prospect: p, mostrarResponsavel }: { prospect: ProspectResponse; mostrarResponsavel: boolean }) {
  const nome = p.lugar?.nome ?? p.nome ?? 'Prospect sem nome';
  const acoes = (
    <AcoesProspect
      prospectId={p.id}
      status={p.status}
      atendeu={p.resultadoVisita === 'ATENDEU'}
      nome={nome}
    />
  );
  // Fechado mostra a data do contrato; antes disso, a da última visita
  const quando = p.fechadoEm
    ? `Fechado em ${formatarData(p.fechadoEm)}`
    : p.visitadoEm
      ? `Visitado em ${formatarDataHora(p.visitadoEm)}`
      : null;
  const linha = [quando, mostrarResponsavel ? p.responsavelNome : null].filter(Boolean).join(' · ');
  const detalhe = (linha || p.observacaoPerda) && (
    <div className="text-xs text-neutral-500 space-y-0.5">
      {linha && <p>{linha}</p>}
      {p.status === 'PERDIDO' && p.observacaoPerda && <p className="break-words italic">“{p.observacaoPerda}”</p>}
    </div>
  );

  if (p.lugar) {
    // O status e a temperatura são os do prospect (a fonte), não os que vieram junto do Google
    return (
      <LugarCard
        lugar={{ ...p.lugar, prospectId: p.id, statusProspect: p.status, temperatura: p.temperatura, deOutroComercial: false }}
        detalhe={detalhe}
        motivoPerda={p.motivoPerda}
        acoes={acoes}
      />
    );
  }

  return (
    <article className="h-full bg-white rounded-xl border border-neutral-200 shadow-card overflow-hidden flex flex-col">
      <div className="aspect-[5/2] md:aspect-video bg-neutral-100 flex items-center justify-center text-neutral-300">
        <Store size={28} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
        <h3 className="font-semibold text-neutral-900 break-words leading-snug">{nome}</h3>
        <div className="-mt-0.5">
          <StatusProspectBadge status={p.status} temperatura={p.temperatura} motivoPerda={p.motivoPerda} />
        </div>
        {detalhe}
        <p className="flex items-start gap-1.5 text-sm text-neutral-600">
          <MapPin size={14} className="mt-0.5 shrink-0 text-neutral-400" aria-hidden="true" />
          <span>
            {p.cidade} - {p.uf}
          </span>
        </p>
        {p.categoria && (
          <p>
            <span className="text-xs text-neutral-600 bg-neutral-100 rounded-md px-2 py-0.5">
              {categoriaProspeccaoLabel[p.categoria]}
            </span>
          </p>
        )}
        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
          <CloudOff size={14} aria-hidden="true" />
          Dados do Google indisponíveis no momento
        </p>
        <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">{acoes}</div>
      </div>
    </article>
  );
}
