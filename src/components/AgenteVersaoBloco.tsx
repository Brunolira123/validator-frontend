import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { monitorApi } from '../api/monitor';
import { mensagemErro } from '../api/erro';
import { Button } from './Button';
import { ErrorAlert } from './ErrorAlert';
import { BadgeAtualizacao } from './BadgeAtualizacao';
import { toast } from '../stores/toastStore';
import { tempoDesde } from '../labels';
import { REGEX_VERSAO } from '../versaoAgente';
import type { StatusAtualizacao, SuporteClienteResponse } from '../types/api';

const statusAtualizacao: Record<StatusAtualizacao, { label: string; className: string }> = {
  ATUALIZADO: { label: 'Atualizado', className: 'text-green-700' },
  FALHOU: { label: 'Falhou', className: 'text-red-600' },
  ROLLBACK: { label: 'Rollback', className: 'text-red-600' },
};

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-4 gap-y-0.5 py-2">
      <dt className="text-xs font-medium text-neutral-500 sm:text-sm sm:font-normal">{rotulo}</dt>
      <dd className="min-w-0 text-sm text-neutral-900 break-words">{children}</dd>
    </div>
  );
}

/** Versão do agente, updater e atualização: só ADMIN e DIRETORIA (o backend também barra). */
export function AgenteVersaoBloco({ cliente }: { cliente: SuporteClienteResponse }) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const pilotoId = useId();
  const [versao, setVersao] = useState('');
  const [erroVersao, setErroVersao] = useState<string | null>(null);
  const { versaoAgente, versaoAlvoAgente, updater, ultimaAtualizacao: ultima } = cliente;

  // A lista única também mostra versão alvo e piloto
  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: ['monitor', 'suporte', 'clientes'] });
    queryClient.invalidateQueries({ queryKey: ['monitor', 'clientes'] });
  };

  const definir = useMutation({
    mutationFn: (v: string | null) => monitorApi.definirVersaoAlvo(cliente.id, v),
    onSuccess: (_, v) => {
      toast(v ? `Versão alvo ${v} definida para ${cliente.nome}.` : `Atualização cancelada em ${cliente.nome}.`);
      setVersao('');
      recarregar();
    },
  });

  const piloto = useMutation({
    mutationFn: (p: boolean) => monitorApi.definirPiloto(cliente.id, p),
    onSuccess: (_, p) => {
      toast(p ? `${cliente.nome} entrou no piloto.` : `${cliente.nome} saiu do piloto.`);
      recarregar();
    },
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const v = versao.trim();
    if (!REGEX_VERSAO.test(v)) {
      setErroVersao('Use o formato 2.4.1 ou 2.5.0-rc.1');
      return;
    }
    if (v === versaoAgente) {
      setErroVersao(`O agente já está na ${v}`);
      return;
    }
    setErroVersao(null);
    definir.mutate(v);
  };

  const erro = definir.error ?? piloto.error;

  return (
    <section aria-labelledby={`${inputId}-titulo`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${inputId}-titulo`} className="text-base font-semibold text-neutral-900">
          Versão do agente
        </h3>
        <label htmlFor={pilotoId} className="inline-flex items-center gap-2 min-h-11 md:min-h-0 cursor-pointer select-none">
          <span className="text-sm text-neutral-700">Piloto</span>
          <button
            id={pilotoId}
            type="button"
            role="switch"
            aria-checked={cliente.piloto}
            disabled={piloto.isPending}
            onClick={() => piloto.mutate(!cliente.piloto)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-vr-500 focus-visible:ring-offset-2 ${
              cliente.piloto ? 'bg-vr-600' : 'bg-neutral-300'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                cliente.piloto ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      <dl className="mt-1 divide-y divide-neutral-100">
        <Linha rotulo="Versão atual">{versaoAgente ?? '—'}</Linha>
        <Linha rotulo="Versão alvo">
          {versaoAlvoAgente ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {versaoAlvoAgente}
              <BadgeAtualizacao cliente={cliente} semVersao />
            </span>
          ) : (
            <span className="text-neutral-500">Nenhuma</span>
          )}
        </Linha>
        <Linha rotulo="Updater">
          {updater ? (
            <>
              Instalado{updater.versao && <span className="text-neutral-500"> · {updater.versao}</span>}
              <span className="block text-xs text-neutral-500">Último contato {tempoDesde(updater.ultimoContato)}</span>
            </>
          ) : (
            <span className="text-neutral-500">Não instalado</span>
          )}
        </Linha>
        <Linha rotulo="Última atualização">
          {ultima ? (
            <>
              <span className={`font-medium ${statusAtualizacao[ultima.status].className}`}>
                {statusAtualizacao[ultima.status].label}
              </span>{' '}
              <span className="tabular-nums">
                {ultima.versaoAnterior ?? '?'} → {ultima.versaoAlvo}
              </span>
              <span className="text-neutral-500"> · {tempoDesde(ultima.em)}</span>
              {ultima.detalhe && <span className="block text-xs text-neutral-500">{ultima.detalhe}</span>}
            </>
          ) : (
            <span className="text-neutral-500">Nenhuma</span>
          )}
        </Linha>
      </dl>

      <form onSubmit={enviar} noValidate className="mt-3 flex flex-col sm:flex-row sm:items-start gap-2">
        <div className="sm:w-56">
          <label htmlFor={inputId} className="sr-only">
            Nova versão alvo
          </label>
          <input
            id={inputId}
            value={versao}
            onChange={(e) => {
              setVersao(e.target.value);
              setErroVersao(null);
            }}
            placeholder="Ex.: 2.4.1"
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={!!erroVersao}
            aria-describedby={erroVersao ? `${inputId}-erro` : undefined}
            className={`w-full min-h-11 px-3 py-2 border rounded-lg tabular-nums focus:outline-none focus:ring-2 transition-colors ${
              erroVersao ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 focus:ring-vr-500'
            }`}
          />
          {erroVersao && (
            <p id={`${inputId}-erro`} className="text-xs text-red-500 mt-1">
              {erroVersao}
            </p>
          )}
        </div>
        <Button type="submit" variant="secondary" loading={definir.isPending && definir.variables != null} className="md:min-h-11">
          Definir versão
        </Button>
        {versaoAlvoAgente && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => definir.mutate(null)}
            loading={definir.isPending && definir.variables == null}
            className="md:min-h-11 sm:ml-auto"
          >
            Cancelar atualização
          </Button>
        )}
      </form>

      {erro && (
        <div className="mt-3">
          <ErrorAlert>{mensagemErro(erro, 'Erro ao alterar o agente')}</ErrorAlert>
        </div>
      )}
    </section>
  );
}
